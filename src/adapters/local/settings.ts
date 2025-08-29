import type { AppSettings, SettingsRepo } from '../../core/repository'

class LocalSettingsRepo implements SettingsRepo {
  private readonly key = 'local-app-settings'

  private load(): Partial<AppSettings> {
    try { const s = localStorage.getItem(this.key); return s ? JSON.parse(s) : {} } catch { return {} }
  }
  private save(obj: Partial<AppSettings>) { localStorage.setItem(this.key, JSON.stringify(obj)) }

  async get(): Promise<AppSettings> {
    const v = this.load()
    return {
      bulletin: v.bulletin,
      bulletinUpdatedAt: v.bulletinUpdatedAt,
      bulletinUpdatedBy: v.bulletinUpdatedBy,
      countdownEnabled: (v as any).countdownEnabled ?? true,
      countdownMinutes: (v as any).countdownMinutes ?? 20,
    }
  }

  async update(patch: Partial<AppSettings>): Promise<AppSettings> {
    const cur = this.load(); const next = { ...cur, ...patch }
    this.save(next)
    return await this.get()
  }
}

export const settingsRepo: SettingsRepo = new LocalSettingsRepo()
