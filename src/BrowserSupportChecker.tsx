import {useEffect, useState} from 'react';
import styles from "./TheWitnessPuzzle/style/BrowserSupportChecker.module.css";

const BrowserSupportChecker = () => {
    // 存储检测结果的状态
    const [supportStatus, setSupportStatus] = useState({
        webWorker: null,
        pointerLock: null
    });

    // 检测浏览器支持性
    useEffect(() => {
        // 检测 Web Worker 支持
        const supportsWebWorker = typeof window !== 'undefined' && 'Worker' in window;

        // 检测 Pointer Lock 支持（考虑浏览器前缀）
        const supportsPointerLock = typeof document !== 'undefined' && (
            'requestPointerLock' in document.documentElement ||
            'mozRequestPointerLock' in document.documentElement ||
            'webkitRequestPointerLock' in document.documentElement
        );

        setSupportStatus({
            webWorker: supportsWebWorker,
            pointerLock: supportsPointerLock
        });
    }, []);

    // 状态标签样式
    const StatusBadge = ({supported}) => (
        <span style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '0.8em',
            fontWeight: 'bold',
            backgroundColor: supported ? '#4CAF50' : '#FFD700',
            color: supported ? 'white' : 'black',
            marginLeft: '8px'
        }}>
      {supported ? '支持' : '不支持'}
    </span>
    );

    return (
        <div className={styles.wrapper}>
            <div className={styles["support-box"]}>
                <p style={{margin: '8px 0'}}>
                    Web Worker:
                    <StatusBadge supported={supportStatus.webWorker}/>
                    <span>用于在后台线程运行随机器脚本，避免卡顿</span>
                </p>
                {!supportStatus.webWorker && (
                    <p className={styles.warning}>
                        ⚠️ 该浏览器不支持 Web Worker，将直接在主线程调用随机器
                    </p>
                )}
            </div>

            <div className={styles["support-box"]}>
                <p style={{margin: '8px 0'}}>
                    Pointer Lock:
                    <StatusBadge supported={supportStatus.pointerLock}/>
                    <span>用于锁定鼠标到页面，提供沉浸式体验</span>
                </p>
                {!supportStatus.pointerLock && (
                    <p className={styles.warning}>
                        ⚠️ 该浏览器不支持 Pointer Lock，影响游戏体验
                    </p>
                )}
            </div>
        </div>
    );
};

export default BrowserSupportChecker;