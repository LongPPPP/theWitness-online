import startSound from '@/assets/sound/panel_start_tracing.aac'
import successSound from '@/assets/sound/panel_success.aac'
import failSound from '@/assets/sound/panel_failure.aac'
import abortSound from '@/assets/sound/panel_abort_tracing.aac'

const soundTracks = {
    'start': new Audio(startSound),
    'success': new Audio(successSound),
    'fail': new Audio(failSound),
    'abort': new Audio(abortSound),
}
let currentAudio = null

export function PLAY_SOUND(name: 'start' | 'success' | 'fail' | 'abort', volume: number): void {
    if (currentAudio) currentAudio.pause()
    const audio = soundTracks[name]
    audio.load()
    audio.volume = volume
    audio.play().then(function () {
        currentAudio = audio
    }).catch(function () {
        // Do nothing.
    })
}

export function deleteElementsByClassName(rootElem: Element, className: string) {
    let elems: HTMLCollectionOf<Element>;
    while (true) {
        elems = rootElem.getElementsByClassName(className)
        if (elems.length === 0) break
        elems[0].remove()
    }
}