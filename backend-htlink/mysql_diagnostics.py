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
    print('PROCESSLIST', len(rows))
    for row in rows[:20]:
        print(row)
    print('---')
    cur.execute("SHOW VARIABLES LIKE 'tmpdir'")
    print(cur.fetchone())
    cur.execute("SHOW STATUS LIKE 'Innodb_row_lock%'")
    for row in cur.fetchall():
        print(row)
conn.close()
