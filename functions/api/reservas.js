const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  }
});

const clean = (value, max) => String(value ?? '').trim().slice(0, max);
const allowedTimes = new Set(['20:30', '21:00', '21:30', '22:00']);

function validate(body) {
  const name = clean(body.name, 80);
  const phone = clean(body.phone, 30);
  const email = clean(body.email, 120).toLowerCase();
  const date = clean(body.date, 10);
  const time = clean(body.time, 5);
  const notes = clean(body.notes, 500);
  const persons = Number(body.persons);

  if (name.length < 3) return { error: 'Ingresá tu nombre completo.' };
  if (phone.length < 7) return { error: 'Ingresá un teléfono válido.' };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Ingresá un email válido.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Elegí una fecha válida.' };
  if (!allowedTimes.has(time)) return { error: 'Elegí un horario disponible.' };
  if (!Number.isInteger(persons) || persons < 1 || persons > 8) return { error: 'La reserva debe ser para entre 1 y 8 personas.' };

  const reservationDate = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(reservationDate.getTime())) return { error: 'La fecha no es válida.' };
  const weekday = reservationDate.getUTCDay();
  if (![4, 5, 6, 0].includes(weekday)) return { error: 'Primuseum recibe reservas de jueves a domingo.' };

  const today = new Date();
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  if (reservationDate.getTime() < todayUTC) return { error: 'No podés reservar una fecha pasada.' };

  return { data: { name, phone, email: email || null, date, time, persons, notes: notes || null } };
}

export async function onRequestPost(context) {
  if (!context.env.DB) return json({ error: 'La base de datos D1 no está configurada.' }, 500);

  let body;
  try { body = await context.request.json(); }
  catch { return json({ error: 'Solicitud inválida.' }, 400); }

  const checked = validate(body);
  if (checked.error) return json({ error: checked.error }, 400);
  const r = checked.data;
  const code = `PM-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;

  try {
    await context.env.DB.prepare(`
      INSERT INTO reservations (code, name, phone, email, reservation_date, reservation_time, persons, notes, status)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'pending')
    `).bind(code, r.name, r.phone, r.email, r.date, r.time, r.persons, r.notes).run();

    return json({ ok: true, code, status: 'pending' }, 201);
  } catch (error) {
    console.error('D1 reservation insert failed', error);
    return json({ error: 'No se pudo guardar la solicitud. Intentá nuevamente.' }, 500);
  }
}

export async function onRequestGet(context) {
  if (!context.env.DB) return json({ error: 'La base de datos D1 no está configurada.' }, 500);
  const url = new URL(context.request.url);
  const code = clean(url.searchParams.get('code'), 20).toUpperCase();
  if (!/^PM-[A-Z0-9]{8}$/.test(code)) return json({ error: 'Código inválido.' }, 400);

  const row = await context.env.DB.prepare(`
    SELECT code, reservation_date AS date, reservation_time AS time, persons, status, created_at
    FROM reservations WHERE code = ?1 LIMIT 1
  `).bind(code).first();

  if (!row) return json({ error: 'No encontramos esa solicitud.' }, 404);
  return json(row);
}
