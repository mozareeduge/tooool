// pdfjs-dist 6.x calls Map/WeakMap.prototype.getOrInsert(Computed) (TC39 "upsert"),
// which many current browsers do not ship yet. Install spec-shaped fallbacks.
type Upsertable<K, V> = {
  has(key: K): boolean
  get(key: K): V | undefined
  set(key: K, value: V): unknown
}

for (const Ctor of [Map, WeakMap] as unknown as { prototype: object }[]) {
  const proto = Ctor.prototype as Record<string, unknown>
  if (typeof proto.getOrInsert !== 'function') {
    Object.defineProperty(proto, 'getOrInsert', {
      configurable: true,
      writable: true,
      value<K, V>(this: Upsertable<K, V>, key: K, value: V): V {
        if (!this.has(key)) this.set(key, value)
        return this.get(key) as V
      },
    })
  }
  if (typeof proto.getOrInsertComputed !== 'function') {
    Object.defineProperty(proto, 'getOrInsertComputed', {
      configurable: true,
      writable: true,
      value<K, V>(this: Upsertable<K, V>, key: K, callback: (key: K) => V): V {
        if (this.has(key)) return this.get(key) as V
        const value = callback(key)
        this.set(key, value)
        return value
      },
    })
  }
}

export {}
