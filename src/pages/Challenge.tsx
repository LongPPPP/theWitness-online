import TheWitnessPuzzle from "../components/TheWitnessPuzzle/TheWitnessPuzzle.tsx";
import MusicPlayer from "../components/MusicPlayer/MusicPlayer.tsx";
import {useState} from 'react';

const endPoints: {
    x: number;
    y: number;
    dir: "left" | "right" | "top" | "bottom"
}[] = [{x: 6, y: 0, dir: 'bottom'}, {x: 0, y: 0, dir: 'top'}]

const audio = new Audio('src/assets/sound/challenge_start.mp3');



export default function Challenge() {
    const [start, setStart] = useState(false);

    function onSuccess(x, y) {
        if (x === endPoints[0].x) {
            audio.playbackRate = 0.8
            audio.volume = 0.8;
            audio.play().then()
            setStart(true);
        } else if (x === endPoints[1].x) {
            audio.pause();
            audio.currentTime = 0;
            setStart(false);
        }
    }

    return (
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
            <div style={{width: 500}}>
                <MusicPlayer start={start}/>
                <TheWitnessPuzzle
                    width={3}
                    height={0}
                    startPoints={[{x: 0, y: 0}]}
                    endPoints={endPoints}
                    outerBackgroundColor={'#0A8'}
                    onSuccess={onSuccess}
                />
            </div>
        </div>
    )
}