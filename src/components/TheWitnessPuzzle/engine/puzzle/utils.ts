const soundTracks = {
    'start': new Audio('src/assets/sound/panel_start_tracing.aac'),
    'success': new Audio('src/assets/sound/panel_success.aac'),
    'fail': new Audio('src/assets/sound/panel_failure.aac'),
    'abort': new Audio('src/assets/sound/panel_abort_tracing.aac'),
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