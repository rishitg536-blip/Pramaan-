export function canonicalJson(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'undefined') {
    return '';
  }

  if (typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value);
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items: string[] = [];
    for (const item of value) {
      if (typeof item === 'undefined') {
        items.push('null');
      } else {
        items.push(canonicalJson(item));
      }
    }
    return `[${items.join(',')}]`;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const pairs: string[] = [];
    for (const key of keys) {
      const v = record[key];
      if (typeof v !== 'undefined') {
        pairs.push(`${JSON.stringify(key)}:${canonicalJson(v)}`);
      }
    }
    return `{${pairs.join(',')}}`;
  }

  return JSON.stringify(value);
}

