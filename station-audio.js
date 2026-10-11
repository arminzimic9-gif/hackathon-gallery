export function createStationAudio(){
  let context=null,master=null,hum=null,humGain=null,mute=false
  function start(){if(mute)return false;const C=window.AudioContext||window.webkitAudioContext;if(!C)return false;if(!context){context=new C();master=context.createGain();master.gain.value=.18;master.connect(context.destination)}context.resume();return true}
  function tone(freq,duration,type='sine',volume=.3,end=freq){if(!start())return;const at=context.currentTime,o=context.createOscillator(),g=context.createGain();o.type=type;o.frequency.setValueAtTime(freq,at);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),at+duration);g.gain.setValueAtTime(Math.max(.001,volume),at);g.gain.exponentialRampToValueAtTime(.001,at+duration);o.connect(g).connect(master);o.start(at);o.stop(at+duration+.02)}
  function cue(name){if(mute)return
    if(name==='stop-drone'){if(humGain&&context)humGain.gain.setTargetAtTime(0,context.currentTime,.25);return}
    if(name==='drone'||name==='engine'){
      if(!start())return
      if(hum){hum.frequency.setTargetAtTime(name==='engine'?75:48,context.currentTime,.3);humGain.gain.setTargetAtTime(name==='engine' ? .055 : .035,context.currentTime,.3);return}
      hum=context.createOscillator();hum.type='sawtooth';hum.frequency.value=name==='engine'?75:48;humGain=context.createGain();humGain.gain.value=.001;hum.connect(humGain).connect(master);hum.start();humGain.gain.setTargetAtTime(name==='engine' ? .055 : .035,context.currentTime,.5);return
    }
    else if(name==='jump'){tone(110,1.7,'sawtooth',.24,1200);tone(900,1.3,'sine',.12,70)}
    else if(name==='crystal'){tone(620,.23,'sine',.21,1240);setTimeout(()=>tone(940,.3,'sine',.15,1450),75)}
    else if(name==='impact'){tone(115,.42,'sawtooth',.32,29)}
    else if(name==='docking'){cue('stop-drone');tone(280,.75,'sine',.14,90)}
    else if(name==='landing'){cue('stop-drone');tone(82,.65,'sawtooth',.35,32);tone(46,1,'sine',.22,25)}
    else if(name==='winner'||name==='ceremony'){tone(290,.9,'sine',.17,580);setTimeout(()=>tone(440,.9,'sine',.12,880),130)}
    else tone(500,.13,'sine',.12,760)
  }
  function stop(){mute=true;master?.gain.setTargetAtTime(0,context.currentTime,.04)}
  function unmute(){mute=false;if(start())master?.gain.setTargetAtTime(.18,context.currentTime,.04)}
  function dispose(){hum?.stop();context?.close();context=null;hum=null}
  return {start,cue,stop,unmute,dispose}
}
