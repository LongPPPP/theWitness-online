import {useEffect, useRef, useState} from 'react';
import cover from '../../assets/picture/cover.jpg'
import disc from '../../assets/picture/disc-ip6.png'
import needle from '../../assets/picture/needle-ip6.png'
import styles from "./MusicPlayer.module.css";

interface Props {
    start: boolean
}

/**
 * 歌曲唱片播放器组件
 * - 点击唱片可播放/暂停动画
 * - 唱片旋转时针臂会移动
 */
function MusicPlayer({start}: Props) {
    const [isPlaying, setIsPlaying] = useState(false);
    const songCoverRef = useRef<HTMLDivElement>(null);
    const songImgRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (start) {
            correctCoverRotate();
            setIsPlaying(true);
        } else {
            setIsPlaying(false);
        }
    }, [start])

    /** 校正封面旋转角度 */
    const correctCoverRotate = () => {
        if (isPlaying && songCoverRef.current && songImgRef.current) {
            const songImgMatrix = window.getComputedStyle(songImgRef.current).getPropertyValue("transform");
            const songCoverMatrix = window.getComputedStyle(songCoverRef.current).getPropertyValue("transform");
            if (songCoverMatrix === "none") {
                songCoverRef.current.style.transform = songImgMatrix;
            } else {
                const matrix1 = parseMatrix(songCoverMatrix);
                const matrix2 = parseMatrix(songImgMatrix);
                const angle1 = calcAngle(+matrix1[0], +matrix1[1]);
                const angle2 = calcAngle(+matrix2[0], +matrix2[1]);
                const angle = angle1 + angle2;
                const radian = (Math.PI / 180) * angle;
                const [a, b, c, d] = [Math.cos(radian), Math.sin(radian), -Math.sin(radian), Math.cos(radian)];
                songCoverRef.current.style.transform = `matrix(${a}, ${b}, ${c}, ${d}, 0, 0)`;
            }
        }
    };

    const parseMatrix = (matrix: string) => {
        const start = matrix.indexOf("(") + 1;
        const end = matrix.indexOf(")");
        const content = matrix.slice(start, end);
        return content.split(", ");
    };

    const calcAngle = (a: number, b: number) => Math.atan2(b, a) * (180 / Math.PI);

    return (
        <div className={styles.app}>
            <div className={styles.songWrap}>
                <div className={styles.songDisc}>
                    <div
                        className={styles.songDiscBg}
                        style={{backgroundImage: `url(${disc})`}}
                    ></div>

                    <div className={styles.songDiscCover} ref={songCoverRef}>
                        <div
                            ref={songImgRef}
                            className={`${styles.songImg} ${isPlaying ? styles.songImgPlay : ""}`}
                        >
                            <img src={cover} alt="cover" className={styles.uImg}/>
                        </div>
                    </div>
                    <div
                        className={`${styles.songNeedle} ${isPlaying ? styles.songNeedlePlay : ""}`}
                        style={{backgroundImage: `url(${needle})`}}
                    ></div>
                </div>
            </div>
        </div>
    );
}

export default MusicPlayer;

