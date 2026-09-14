const { getStore } = require('@netlify/blobs');

const DEFAULT_ROSTER = [
  { id: 1, name: 'Amani Noah', cls: 'S6' },
  { id: 2, name: 'Cyusa Ryan', cls: 'S4' },
  { id: 3, name: 'Hirwa Kaberuka Kenny', cls: 'S5' },
  { id: 4, name: 'Joshua Mico Ryan', cls: 'S4' },
  { id: 5, name: 'Joshua Nganji Reigns', cls: 'S3' },
  { id: 6, name: 'Kwizera Egide', cls: 'S6' },
  { id: 7, name: 'Mugabo John', cls: 'S3' },
  { id: 8, name: 'Mugabo Pierre', cls: 'S4' },
  { id: 9, name: 'Muganwa Enzo', cls: 'S5' },
  { id: 10, name: 'Mutembe Taylor', cls: 'S5' },
  { id: 11, name: 'Narinda Jason Jesy', cls: 'S5' },
  { id: 12, name: 'Nkurikiyinka Imena Bob Joel', cls: 'S3' },
  { id: 13, name: 'Sakufi Aime Christian', cls: 'S6' },
  { id: 14, name: 'Semuhungu Nathan Izere', cls: 'S4' }
];

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const store = getStore('green-house-attendance');

    if (event.httpMethod === 'GET') {
      const roster = (await store.get('roster', { type: 'json' })) || DEFAULT_ROSTER;
      const attendance = (await store.get('attendance', { type: 'json' })) || {};
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ roster, attendance })
      };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (body.roster !== undefined) await store.setJSON('roster', body.roster);
      if (body.attendance !== undefined) await store.setJSON('attendance', body.attendance);
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true })
      };
    }

    return { statusCode: 405, headers, body: 'Method not allowed' };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
