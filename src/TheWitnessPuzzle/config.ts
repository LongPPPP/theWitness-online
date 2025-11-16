export interface Config {
    // theme: 'theme-light' | 'theme-dark',
    volume: number,
    sensitivity: number,
    enableEndHints: boolean,
    wittleTracing: boolean,
    onSuccess: (x: number, y: number) => void,
}

export default class ConfigService {
    private static instance: ConfigService;
    private config: Config;

    private constructor() {
    }

    static getInstance(): ConfigService {
        if (!ConfigService.instance) {
            ConfigService.instance = new ConfigService();
        }
        return ConfigService.instance;
    }

    setConfig(config: Config): void {
        this.config = config;
    }

    public get Config() {
        if (!this.config) {
            throw new Error('Config not initialized. Call setConfig first.');
        }
        return this.config;
    }
}