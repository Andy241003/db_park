import pymysql
from urllib.parse import urlparse, unquote

url = 'mysql+pymysql://vr_adventure_park_user:AdventureDB%401234@travel.link360.vn:3306/vr_adventure_park_db'
parsed = urlparse(url)
conn = pymysql.connect(
    host=parsed.hostname,
    port=parsed.port,
    user=parsed.username,
    password=unquote(parsed.password),
    db=parsed.path.lstrip('/'),
    cursorclass=pymysql.cursors.DictCursor,
)
with conn.cursor() as cur:
    cur.execute('SHOW PROCESSLIST')
    rows = cur.fetchall()
    stuck_ids = []
    for row in rows:
        if row['Command'] == 'Query' and row['Info'] and row['Info'].strip().upper().startswith('COMMIT') and row['Time'] > 60:
            stuck_ids.append(row['Id'])
    if not stuck_ids:
        print('No stuck COMMIT sessions found.')
    for session_id in stuck_ids:
        print('Killing session', session_id)
        cur.execute(f'KILL {session_id}')
conn.commit()
conn.close()
