"""Contract tests for the gallery's reviewed public/private app service."""
import base64
from io import BytesIO
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import unittest

from PIL import Image


SERVICE = Path(__file__).with_name('service.py')


def image_data(format='PNG'):
    image = Image.new('RGB', (2200, 1100), '#cfed70')
    output = BytesIO()
    image.save(output, format=format)
    return 'data:image/' + format.lower() + ';base64,' + base64.b64encode(output.getvalue()).decode()


class GalleryServiceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)

    def call(self, path, method='GET', body=None, public=False, access='write'):
        request = {'schema': 1, 'path': path, 'method': method, 'body': body,
                   'public': public, 'actor': {'scope': 'public' if public else 'owner', 'access': access}}
        result = subprocess.run([sys.executable, str(SERVICE)], input=json.dumps(request), text=True,
                                capture_output=True, env={**os.environ, 'APP_STORAGE_DIR': self.temp.name,
                                                          'INSTANCE_ORIGIN': 'https://gallery.example'}, check=True)
        self.assertFalse(result.stderr, result.stderr)
        return json.loads(result.stdout)

    def participant(self, name='Ada'):
        created = self.call('codes/create', 'POST', {'count': 1, 'label': 'Finalists'})
        self.assertEqual(created['status'], 201)
        code = created['body']['created'][0]
        signed = self.call('signin', 'POST', {'code': code, 'name': name}, public=True)
        self.assertEqual(signed['status'], 200)
        return code, signed['body']['token']

    def test_rooms_are_seeded_editable_and_validated(self):
        art = self.call('state')['body']['art']
        self.assertEqual({item['id']: item['room'] for item in art}['sample-01'], 'memes')
        moved = self.call('admin/update', 'POST', {'id': 'sample-01', 'room': 'agents'})
        self.assertEqual(moved['status'], 200)
        art = self.call('state')['body']['art']
        self.assertEqual({item['id']: item['room'] for item in art}['sample-01'], 'agents')
        bad = self.call('admin/update', 'POST', {'id': 'sample-01', 'room': 'basement'})
        self.assertEqual(bad['status'], 400)

    def test_optional_exhibition_details_survive_updates_without_invented_defaults(self):
        before = self.call('state')['body']['art'][0]
        self.assertEqual(before['medium'], '')
        edited = self.call('admin/update', 'POST', {
            'id': before['id'], 'art_date': 'October 2026', 'medium': 'Digital collage',
            'dimensions': '1440 × 960 px', 'artist_years': '1998–', 'artist_place': 'Sarajevo'})
        self.assertEqual(edited['status'], 200)
        after = self.call('state')['body']['art'][0]
        self.assertEqual(after['medium'], 'Digital collage')
        self.assertEqual(after['dimensions'], '1440 × 960 px')
        self.assertEqual(after['artist_place'], 'Sarajevo')
        invalid = self.call('admin/update', 'POST', {'id': before['id'], 'artist_place': 'x' * 101})
        self.assertEqual(invalid['status'], 400)
        self.assertEqual(self.call('state')['body']['art'][0]['artist_place'], 'Sarajevo')

    def test_scores_rank_by_game_direction_and_validate(self):
        self.assertEqual(self.call('scores')['body']['scores']['coins'], [])
        self.call('scores/add', 'POST', {'game': 'coins', 'name': 'Ada', 'score': 12})
        best = self.call('scores/add', 'POST', {'game': 'coins', 'name': 'Lin', 'score': 20})['body']
        self.assertEqual(best['rank'], 1)
        self.assertEqual([s['name'] for s in best['scores']['coins']], ['Lin', 'Ada'])
        self.call('scores/add', 'POST', {'game': 'memory', 'name': 'Ada', 'score': 48.25})
        fast = self.call('scores/add', 'POST', {'game': 'memory', 'name': 'Lin', 'score': 31})['body']
        self.assertEqual(fast['scores']['memory'][0]['display'], '0:31.0')
        self.assertEqual(self.call('scores/add', 'POST', {'game': 'chess', 'name': 'x', 'score': 1})['status'], 400)
        self.assertEqual(self.call('scores/add', 'POST', {'game': 'coins', 'name': 'x', 'score': 9999})['status'], 400)
        self.assertEqual(self.call('scores/add', 'POST', {'game': 'coins', 'name': '', 'score': 3})['status'], 400)
        # Guests may read the official board, but only a signed-in participant writes it.
        self.assertEqual(self.call('scores', public=True)['body']['scores']['coins'][0]['name'], 'Lin')
        self.assertEqual(self.call('scores/submit', 'POST', {'game': 'coins', 'score': 40},
                                   public=True)['status'], 401)

    def test_top_pilots_store_callsign_and_colours_without_changing_arcade_scores(self):
        pilot = {'game': 'flight', 'name': 'Nova-7', 'score': 250,
                 'suit_color': '#ff9d4e', 'visor_color': '#72e4ff'}
        saved = self.call('scores/add', 'POST', pilot)
        self.assertEqual(saved['status'], 201)
        self.assertEqual(saved['body']['rank'], 1)
        leader = self.call('scores')['body']['scores']['flight'][0]
        self.assertEqual((leader['name'], leader['suit_color'], leader['visor_color']),
                         ('Nova-7', '#ff9d4e', '#72e4ff'))
        self.assertEqual(self.call('scores/add', 'POST', {**pilot, 'score': 250.5})['status'], 400)
        self.assertEqual(self.call('scores/add', 'POST', {**pilot, 'visor_color': 'red'})['status'], 400)
        self.assertEqual(self.call('scores')['body']['scores']['coins'], [])

    def test_seed_is_once_only_and_public_cannot_curate(self):
        initial = self.call('state')['body']
        self.assertEqual(len(initial['art']), 9)
        self.assertTrue(all(x['placeholder'] for x in initial['art']))
        self.assertEqual(self.call('admin/remove', 'POST', {'id': 'sample-01'})['status'], 200)
        self.assertEqual(len(self.call('state')['body']['art']), 8)
        self.assertEqual(self.call('admin/remove', 'POST', {'id': 'sample-02'}, public=True)['status'], 404)
        self.assertEqual(self.call('admin/remove', 'POST', {'id': 'sample-02'}, access='read')['status'], 403)

    def test_public_submission_is_pending_until_approved_and_image_is_downscaled(self):
        _, token = self.participant('Ada L')
        submission = self.call('submit', 'POST', {'title': 'Hello gallery', 'author': 'A participant',
            'caption': 'A new artwork', 'token': token, 'image_data_url': image_data()}, public=True)
        self.assertEqual(submission['status'], 202)
        item_id = submission['body']['submission_id']
        self.assertEqual(len(self.call('gallery', public=True)['body']['art']), 9)
        self.assertEqual(len(self.call('state')['body']['queue']), 1)
        approved = self.call('admin/approve', 'POST', {'id': item_id})
        self.assertEqual(approved['status'], 200)
        self.assertEqual(len(approved['body']['queue']), 0)
        item = approved['body']['art'][-1]
        self.assertFalse(item['placeholder'])
        self.assertAlmostEqual(item['ratio'], 2)
        self.assertEqual(item['mime'], 'image/webp')
        media = self.call('media/' + item['id'], public=True)
        self.assertEqual(media['media_type'], 'image/webp')
        image = Image.open(BytesIO(base64.b64decode(media['body_base64'])))
        self.assertEqual(image.size, (1440, 720))

    def test_sender_limit_validation_and_rejection(self):
        image = image_data()
        _, token = self.participant('Same Person')
        # A rejected image still uses that participant's hourly budget, so it gets its own code here.
        _, other = self.participant('Other Person')
        malformed = self.call('submit', 'POST', {'title': 'Bad', 'author': 'A', 'token': other,
            'image_data_url': image.replace('image/png', 'image/gif')}, public=True)
        self.assertEqual(malformed['status'], 400)
        ids = []
        for i in range(5):
            result = self.call('submit', 'POST', {'title': 'Meme ' + str(i), 'author': 'A',
                'token': token, 'image_data_url': image}, public=True)
            self.assertEqual(result['status'], 202)
            ids.append(result['body']['submission_id'])
        self.assertEqual(self.call('submit', 'POST', {'title': 'Too many', 'author': 'A',
            'token': token, 'image_data_url': image}, public=True)['status'], 429)
        self.assertEqual(self.call('admin/reject', 'POST', {'id': ids[0]})['status'], 200)
        self.assertEqual(len(self.call('state')['body']['queue']), 4)

    def test_participant_codes_gate_submissions_and_official_scores(self):
        self.assertEqual(self.call('submit', 'POST', {'title': 'No code', 'author': 'A',
            'image_data_url': image_data()}, public=True)['status'], 401)
        self.assertEqual(self.call('signin', 'POST', {'code': 'HS-NOPE-NOPE', 'name': 'Guest'},
                                   public=True)['status'], 403)
        self.assertEqual(self.call('signin', 'POST', {'code': '', 'name': 'Guest'}, public=True)['status'], 400)
        code, token = self.participant('Vera K')
        run = self.call('scores/submit', 'POST', {'game': 'flight', 'score': 640, 'token': token,
            'suit_color': '#ff9d4e', 'visor_color': '#72e4ff'}, public=True)
        self.assertEqual(run['status'], 201)
        leader = self.call('scores', public=True)['body']['scores']['flight'][0]
        self.assertEqual((leader['name'], leader['display']), ('Vera K', '640 pts'))
        tampered = token[:-3] + ('aaa' if not token.endswith('aaa') else 'bbb')
        self.assertEqual(self.call('verify', 'POST', {'token': tampered}, public=True)['status'], 401)
        self.assertEqual(self.call('verify', 'POST', {'token': token}, public=True)['body']['name'], 'Vera K')
        self.assertEqual(self.call('codes/revoke', 'POST', {'code': code})['status'], 200)
        self.assertEqual(self.call('verify', 'POST', {'token': token}, public=True)['status'], 401)
        self.assertEqual(self.call('signin', 'POST', {'code': code, 'name': 'Vera K'},
                                   public=True)['status'], 403)

    def test_opt_in_presence_two_guests_share_only_the_same_walkable_room(self):
        def pilot(visit, room='hangar', x=0, z=3):
            return {'id': visit, 'room': room, 'callsign': 'NOVA-7',
                    'helmet': 1, 'suit': 2, 'visor': 3, 'x': x, 'z': z, 'yaw': 0.2}
        first = self.call('presence', 'POST', pilot('a' * 32), public=True)
        self.assertEqual(first['status'], 200)
        self.assertEqual(first['body']['peers'], [])
        second = self.call('presence', 'POST', pilot('b' * 32, x=2), public=True)
        self.assertEqual(second['status'], 200)
        self.assertEqual(second['body']['online'], 1)
        other = second['body']['peers'][0]
        self.assertEqual((other['callsign'], other['x'], other['helmet']), ('NOVA-7', 0, 1))
        self.assertNotIn(other['id'], ('a' * 32, 'b' * 32))
        self.assertEqual(len(other['id']), 24)
        self.assertEqual(self.call('presence', 'POST', pilot('c' * 32, 'gallery'), public=True)['body']['peers'], [])
        self.assertEqual(self.call('presence', 'POST', pilot('a' * 32), public=True)['body']['online'], 1)
        self.assertEqual(self.call('presence', 'POST', {'id': 'b' * 32, 'leave': True}, public=True)['status'], 200)
        self.assertEqual(self.call('presence', 'POST', pilot('a' * 32), public=True)['body']['peers'], [])
        # Presence must never create an official result or participant code.
        self.assertEqual(self.call('scores', public=True)['body']['scores']['flight'], [])
        self.assertEqual(self.call('codes')['body']['codes'], [])

    def test_presence_rejects_bad_coordinates_and_expires_stale_visits(self):
        pilot = {'id': 'a' * 32, 'room': 'hangar', 'callsign': 'PILOT-1',
                 'helmet': 0, 'suit': 0, 'visor': 0, 'x': 0, 'z': 0, 'yaw': 0}
        self.assertEqual(self.call('presence', 'POST', {**pilot, 'id': 'bad'}, public=True)['status'], 400)
        self.assertEqual(self.call('presence', 'POST', {**pilot, 'room': 'flight'}, public=True)['status'], 400)
        self.assertEqual(self.call('presence', 'POST', {**pilot, 'x': 900}, public=True)['status'], 400)
        self.assertEqual(self.call('presence', 'POST', {**pilot, 'callsign': '<script>'}, public=True)['status'], 400)
        self.assertEqual(self.call('presence', 'POST', pilot, public=True)['status'], 200)
        with sqlite3.connect(Path(self.temp.name) / 'gallery.sqlite3') as db:
            db.execute('UPDATE presence SET updated_at=0')
        guest = self.call('presence', 'POST', {**pilot, 'id': 'b' * 32}, public=True)
        self.assertEqual(guest['body']['online'], 0)

    def test_owner_lists_and_bounds_participant_codes(self):
        self.assertEqual(self.call('codes')['body']['codes'], [])
        batch = self.call('codes/create', 'POST', {'count': 3, 'label': 'Weekend'})['body']
        self.assertEqual(len(batch['created']), 3)
        self.assertTrue(all(c.startswith('HS-') and len(c) == 12 for c in batch['created']))
        self.assertEqual([c['label'] for c in batch['codes']], ['Weekend'] * 3)
        self.assertEqual(self.call('codes/create', 'POST', {'count': 51})['status'], 400)
        self.assertEqual(self.call('codes/create', 'POST', {'count': 1}, public=True)['status'], 404)
        self.assertEqual(self.call('codes', public=True)['status'], 404)
        used = self.call('codes')['body']['codes'][0]['code']
        self.call('signin', 'POST', {'code': used, 'name': 'First'}, public=True)
        rows = {c['code']: c for c in self.call('codes')['body']['codes']}
        self.assertIsNotNone(rows[used]['used_at'])
        self.assertTrue(all(rows[c]['used_at'] is None for c in rows if c != used))

    def test_order_winners_and_reactions_are_atomic(self):
        art = self.call('state')['body']['art']
        ids = [x['id'] for x in art]
        self.assertEqual(self.call('admin/reorder', 'POST', {'ids': list(reversed(ids))})['status'], 200)
        self.assertEqual(self.call('state')['body']['art'][0]['id'], ids[-1])
        self.assertEqual(self.call('admin/update', 'POST', {'id': ids[0], 'winner_rank': 1})['status'], 200)
        self.assertEqual(self.call('admin/update', 'POST', {'id': ids[1], 'winner_rank': 1})['status'], 200)
        winners = [x for x in self.call('state')['body']['art'] if x['winner_rank'] == 1]
        self.assertEqual([x['id'] for x in winners], [ids[1]])
        self.assertEqual(self.call('react', 'POST', {'id': ids[1], 'emoji': '🔥'})['status'], 200)
        self.assertEqual(self.call('state')['body']['art'][-2]['reactions']['🔥'], 1)


if __name__ == '__main__':
    unittest.main()
