'use client';

import { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import MyTrainingList from '@/components/capacitaciones/MyTrainingList';
import { friendlyMineError } from '@/lib/capacitaciones/my-view';
import { isDone } from '@/lib/capacitaciones/status';
import { myTrainings, type MyTraining } from './actions';
import s from '@/components/panel/panel.module.css';

export default function MisCapacitacionesPage() {
  const [items, setItems] = useState<MyTraining[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => new Date());

  useEffect(() => {
    let alive = true;
    myTrainings()
      .then(r => { if (!alive) return; if (r.ok) setItems(r.items); else setError(friendlyMineError(r.error)); })
      .catch(() => { if (alive) setError('No se pudieron cargar tus capacitaciones. Intenta de nuevo.'); });
    return () => { alive = false; };
  }, []);

  const done = items ? items.filter(i => isDone(i.status)).length : 0;
  return (
    <AdminShell>
      <div className={s.page}>
        <header className={s.top}>
          <div>
            <div className={s.eyebrow}><i />Mis capacitaciones</div>
            <h1 className={s.title}>Mis capacitaciones</h1>
            {items && items.length > 0 && <div className={s.sub}>{done} de {items.length} listas</div>}
          </div>
        </header>
        <div className={s.content}>
          {error ? <div className={s.error}>{error}</div>
            : !items ? <p className={s.loading}>Cargando tus capacitaciones…</p>
            : <MyTrainingList items={items} now={now} />}
        </div>
      </div>
    </AdminShell>
  );
}
