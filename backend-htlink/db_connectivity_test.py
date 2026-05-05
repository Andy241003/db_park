import socket
s = socket.socket()
s.settimeout(5)
code = s.connect_ex(('travel.link360.vn', 3306))
print(code)
s.close()
