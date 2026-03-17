const concepts = [
  {
    id: 1,
    title: "The OSI Model",
    tag: "THE SEVEN-LAYER CAKE OF NETWORKING",
    color: "#4F46E5",
    tldr: `The OSI (Open Systems Interconnection) model is a conceptual framework that divides network communication into 7 distinct layers, each with a specific job. It exists so engineers can reason about, build, and debug networks in isolation — a problem at Layer 3 doesn't mean you touch Layer 7. Every packet you send on the internet traverses all 7 layers on both ends.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
When Rohan's app couldn't connect to the payment gateway, he spent 4 hours debugging his Node.js fetch() code — only to discover the server's firewall was blocking port 443. He was debugging Layer 7 (Application) when the problem was Layer 4 (Transport/Firewall). 

Without OSI mental model, engineers:
  - Fix the wrong layer (rewriting API code when DNS is broken)
  - Can't read Wireshark/tcpdump output meaningfully
  - Don't understand what TLS, TCP, IP, and Ethernet actually ARE relative to each other
  - Can't place tools like nginx, iptables, or a CDN in the stack

The OSI model gives you a MAP. Every networking concept (TCP, IP, DNS, HTTP, TLS, WebSockets) lives at a specific layer. When something breaks, you start at Layer 1 and move up — not guess randomly.
    `,
    analogy: `
THE POSTAL SYSTEM ANALOGY:
--------------------------
Imagine sending a physical package from Mumbai to Delhi through a courier company.

Layer 7 - Application:  YOU write the letter (the message content — HTTP request, email, etc.)
Layer 6 - Presentation: You TRANSLATE it to English if needed, seal it in an envelope (encryption/encoding)
Layer 5 - Session:       You establish a CONVERSATION (open/close/manage the exchange — like a phone call setup)
Layer 4 - Transport:     The courier assigns a TRACKING NUMBER, splits big packages, reassembles them (TCP/UDP ports, segmentation)
Layer 3 - Network:       The ROUTING CENTER decides which city-to-city road to use (IP addresses, routers)
Layer 2 - Data Link:     The LOCAL DELIVERY VAN navigates within a city neighborhood (MAC addresses, switches)
Layer 1 - Physical:      The actual ROAD, VEHICLE, and TIRES carrying the package (cables, fiber, radio waves)

Key insight: Each layer ONLY talks to the layer directly above and below it. Your Node.js app (Layer 7) has NO IDEA it's riding on fiber optic cables (Layer 1) — and that's the entire point of abstraction.

When you get a "connection refused" error, it means the package reached the right BUILDING (Layer 3 worked), knocked on the right DOOR (Layer 4 found the port), but nobody answered (Layer 7 app isn't listening). The OSI model tells you EXACTLY which layer failed.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — ALL 7 LAYERS:
-----------------------------------------

LAYER 1 — PHYSICAL
  - Deals with raw bits: voltage levels, light pulses (fiber), radio waves (WiFi)
  - Hardware: network cables (Cat5e/Cat6), fiber optic, NICs, hubs, repeaters
  - Units: bits
  - Key concern: signal strength, bandwidth (Hz), noise
  - Ethernet over Cat6 can carry 10 Gbps over 100m. Beyond that, signal degrades.

LAYER 2 — DATA LINK
  - Frames bits into addressable chunks using MAC addresses (48-bit hardware addresses, e.g. 00:1A:2B:3C:4D:5E)
  - Handles LOCAL network delivery — within the same LAN/VLAN
  - Protocols: Ethernet (IEEE 802.3), WiFi (IEEE 802.11), ARP (Address Resolution Protocol)
  - Hardware: Switches (operate at L2), bridges
  - Units: frames
  - ARP is how your machine maps IP→MAC: "Who has 192.168.1.1? Tell 192.168.1.50"
  - VLANs segment a physical network into isolated logical networks at L2
  - STP (Spanning Tree Protocol) prevents switching loops at L2

LAYER 3 — NETWORK
  - Routes packets across DIFFERENT networks using IP addresses (32-bit IPv4, 128-bit IPv6)
  - Hardware: Routers, Layer 3 switches
  - Protocols: IP, ICMP (ping lives here), OSPF, BGP (the internet's routing protocol)
  - Units: packets
  - Key: IP is CONNECTIONLESS and UNRELIABLE — no delivery guarantee
  - NAT (Network Address Translation) lives here: maps private IPs (192.168.x.x) to public IPs
  - Subnetting: 192.168.1.0/24 means first 24 bits are network, last 8 are host → 254 usable hosts
  - TTL (Time To Live) field in IP header prevents infinite routing loops

LAYER 4 — TRANSPORT
  - Multiplexes multiple streams over one IP using PORTS (0–65535)
  - Two main protocols:
    TCP (Transmission Control Protocol):
      - Connection-oriented: requires 3-way handshake (SYN → SYN-ACK → ACK)
      - Reliable: guarantees delivery, ordering, retransmission on loss
      - Flow control: prevents fast sender from overwhelming slow receiver (sliding window)
      - Congestion control: backs off when network is congested (AIMD algorithm)
      - Stateful: both sides maintain connection state
    UDP (User Datagram Protocol):
      - Connectionless: fire and forget
      - Unreliable: no delivery guarantee, no ordering
      - Fast and low-overhead: great for video streaming, gaming, DNS
  - Units: segments (TCP) / datagrams (UDP)
  - Firewalls (iptables, AWS Security Groups) primarily operate at L4 (block ports)
  - Port ranges: 0-1023 well-known (HTTP=80, HTTPS=443, SSH=22), 1024-49151 registered, 49152-65535 ephemeral

LAYER 5 — SESSION
  - Manages sessions: establishes, maintains, and terminates connections
  - In practice, thin layer in modern protocols — often merged with L4/L7
  - Examples: TLS handshake session establishment, NetBIOS, RPC session management
  - Session tokens in web apps are a conceptual L5 idea

LAYER 6 — PRESENTATION
  - Handles data FORMAT, encoding, encryption
  - Converts data to a format the application can use
  - Examples: TLS/SSL encryption lives conceptually here, JSON/XML encoding, gzip compression, JPEG/PNG encoding
  - Character encoding: ASCII, UTF-8 translation
  - In practice, also often merged with L7 in TCP/IP stack

LAYER 7 — APPLICATION
  - The protocols YOUR code directly interacts with
  - HTTP, HTTPS, DNS, SMTP, FTP, WebSocket, gRPC, MQTT
  - Where cookies, HTTP headers, REST APIs live
  - Wireshark can decode L7 protocols and show you raw HTTP requests

TCP/IP MODEL vs OSI MODEL:
  The real internet uses the TCP/IP model (4 layers), which collapses OSI layers:
  - Application layer = OSI L5 + L6 + L7
  - Transport layer  = OSI L4
  - Internet layer   = OSI L3
  - Link layer       = OSI L1 + L2
  
  OSI is a CONCEPTUAL framework for thinking; TCP/IP is what actually runs.

WHAT EACH TOOL/TECHNOLOGY OPERATES AT:
  L1: cables, fiber, WiFi radio
  L2: Ethernet switch, ARP, MAC spoofing, VLANs
  L3: Router, iptables (IP rules), ping, traceroute, VPN (tunnels L3 inside L3)
  L4: TCP, UDP, firewalls (port rules), load balancers (L4 LBs like AWS NLB)
  L5-6: TLS (encryption wrapper)
  L7: HTTP, nginx (reverse proxy), CDN edge, WAF (Web Application Firewall), API Gateway
    `,
    code: `
// ===== OSI MODEL — CODE EXAMPLES =====

// EXAMPLE 1: Layer 7 — Making an HTTP request (Application Layer)
// Your code operates at L7 — you see headers, body, status codes
const https = require('https'); // Node.js built-in
https.get('https://api.example.com/users/priya', (res) => {
  console.log('Status:', res.statusCode);      // HTTP 200, 404, 500 — L7 concepts
  console.log('Headers:', res.headers);         // Content-Type, Cache-Control — L7
  // Underneath: TLS (L6) → TCP (L4) → IP (L3) → Ethernet (L2) → wire (L1)
  // You see NONE of that complexity — abstraction working as intended
});

// EXAMPLE 2: Layer 4 — TCP socket (Transport Layer)
// Raw TCP: you control the connection, ports, but not routing
const net = require('net');
const client = net.createConnection({ host: '192.168.1.10', port: 8080 }, () => {
  console.log('TCP connection established'); // 3-way handshake completed
  client.write('Hello Server\n');           // Sending data over TCP stream
});
client.on('data', (data) => {
  console.log('Received:', data.toString());
  client.end(); // Send FIN to close TCP connection gracefully
});
// Ports tell the OS WHICH process to deliver data to (L4 multiplexing)

// EXAMPLE 3: Layer 4 — UDP socket (no connection, no guarantee)
// Used for: DNS lookups, video calls, online gaming (Valorant, BGMI)
const dgram = require('dgram');
const socket = dgram.createSocket('udp4');
const message = Buffer.from('ping');
socket.send(message, 53, '8.8.8.8', (err) => {
  // Sent to Google DNS on port 53 — NO handshake, NO ACK
  // Packet might get lost — UDP doesn't care
  console.log('UDP datagram sent (no delivery guarantee)');
  socket.close();
});

// EXAMPLE 4: Diagnosing which OSI layer has a problem
// Tools mapped to layers — use the right tool for the right layer
/*
Layer 1 problems: cable unplugged, NIC down
  → ifconfig / ip link show (check if interface is UP)
  → ethtool eth0 (check physical link)

Layer 2 problems: ARP failure, switch misconfiguration  
  → arp -a (view ARP table: IP→MAC mappings)
  → tcpdump -e (show Ethernet frames with MAC addresses)

Layer 3 problems: routing, wrong IP, firewall blocking IP
  → ping 8.8.8.8 (ICMP — tests L3 connectivity)
  → traceroute google.com (shows each L3 hop)
  → ip route show (view routing table)

Layer 4 problems: port blocked, service not listening
  → telnet api.example.com 443 (test TCP connection)
  → nc -zv api.example.com 443 (netcat — cleaner)
  → ss -tlnp (show listening TCP sockets)
  → sudo iptables -L (view firewall rules)

Layer 7 problems: wrong HTTP status, bad response body
  → curl -v https://api.example.com (shows full HTTP exchange)
  → Postman / Insomnia
*/

// EXAMPLE 5: Encapsulation — data getting wrapped at each layer
// This is what happens when you call fetch() in your browser:
/*
  Your data:           { "amount": 5000, "to": "Anjali" }
  + L7 HTTP:           POST /transfer HTTP/1.1\r\nContent-Type: application/json\r\n\r\n{...}
  + L5/6 TLS:          [encrypted bytes — nobody can read this in transit]
  + L4 TCP segment:    [source port: 54321][dest port: 443][seq: 1001][data: encrypted blob]
  + L3 IP packet:      [src IP: 10.0.0.5][dst IP: 142.250.80.46][TTL: 64][TCP segment]
  + L2 Ethernet frame: [src MAC: AA:BB:CC...][dst MAC: DD:EE:FF...][IP packet][FCS checksum]
  + L1 Physical:       10101001110101... (bits on wire)

  At the destination, each layer UNWRAPS its envelope and passes up.
  This is called ENCAPSULATION (sending) and DECAPSULATION (receiving).
*/

// EXAMPLE 6: Practical — checking OSI layers in a real debugging session
// Scenario: Priya's app can't reach the payment API
async function debugConnectivity(host, port) {
  // Step 1: Can we resolve the hostname? (DNS = L7 but uses UDP L4)
  const dns = require('dns').promises;
  try {
    const addresses = await dns.resolve4(host);
    console.log(\`DNS OK: \${host} → \${addresses}\`); // L3/L7
  } catch (e) {
    console.error('DNS FAILED — Layer 7 (DNS resolution):', e.message);
    return; // Stop here, fix DNS first
  }

  // Step 2: Can we establish TCP connection? (L4)
  const net = require('net');
  await new Promise((resolve) => {
    const sock = net.createConnection({ host, port }, () => {
      console.log(\`TCP OK: \${host}:\${port} reachable\`); // L4
      sock.destroy();
      resolve();
    });
    sock.on('error', (e) => {
      console.error(\`TCP FAILED — Layer 4 (port \${port} blocked or not listening)\`, e.message);
      resolve();
    });
    sock.setTimeout(3000, () => {
      console.error('TCP TIMEOUT — possible firewall dropping packets silently');
      sock.destroy();
      resolve();
    });
  });
}

debugConnectivity('api.razorpay.com', 443);

// EXAMPLE 7: L2 ARP — how your machine finds the router's MAC address
/*
  When you send a packet to 8.8.8.8 (Google DNS):
  1. Your OS checks routing table: "8.8.8.8 is outside my subnet, use gateway 192.168.1.1"
  2. OS needs MAC address of 192.168.1.1 to build the Ethernet frame
  3. ARP broadcast: "Who has 192.168.1.1? Tell 192.168.1.50" (FF:FF:FF:FF:FF:FF broadcast)
  4. Router replies: "192.168.1.1 is at AA:BB:CC:DD:EE:FF"
  5. OS caches this in ARP table (arp -a to view)
  6. Ethernet frame is built with router's MAC as destination
  7. Router receives frame, strips L2, looks at L3 IP, routes to next hop
  
  ARP SPOOFING ATTACK: Attacker broadcasts "192.168.1.1 is at MY-MAC"
  → All your traffic goes to attacker (Man-in-the-Middle at L2!)
  → Defense: Dynamic ARP Inspection on switches, VPNs
*/
    `,
    bugs: `
REAL PRODUCTION BUGS FROM OSI MISUNDERSTANDING:
-------------------------------------------------

BUG 1: Debugging L7 code when the problem is L4 firewall
  Scenario: Arjun deployed a new microservice. "Connection refused" on port 8080.
  Wrong approach: Spent 2 hours checking Express.js route handlers, middleware
  Root cause: AWS Security Group didn't allow inbound TCP on port 8080 (L4 rule)
  Fix: aws ec2 authorize-security-group-ingress --protocol tcp --port 8080 --cidr 0.0.0.0/0
  Lesson: Always test TCP connectivity (nc -zv host port) before debugging application code

BUG 2: MTU mismatch causing silent packet fragmentation and drops
  Scenario: Large file uploads worked locally but silently hung in production (AWS VPC)
  Root cause: VPN added 50-byte overhead → packets exceeded MTU (1500 bytes) → fragmentation
    → Some intermediate routers had "DF" (Don't Fragment) set → packets dropped silently
  Detection: ping -M do -s 1400 <host> (test with specific packet size)
  Fix: Set TCP MSS clamping on VPN interface: iptables -t mangle -A FORWARD -p tcp 
    --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu
  Lesson: L1/L2 physical limits (MTU) can silently corrupt L7 behavior

BUG 3: ARP cache poisoning causing intermittent failures in test environment  
  Scenario: Two VMs with same IP accidentally assigned. Requests randomly hit wrong server.
  Root cause: Both machines responded to ARP for same IP (L2). OS cached whichever replied first.
  Debugging: arp -a showed MAC changing for same IP between requests
  Fix: Assign unique IPs (obviously), or use static ARP entries for critical hosts
  Lesson: L2 ARP is stateless and trusting by default — anyone can claim any IP

BUG 4: Treating UDP like TCP in streaming app (loss causing corrupted video frames)
  Scenario: Kiran built a live streaming app using UDP. Frames arrived scrambled.
  Root cause: UDP segments can arrive OUT OF ORDER. Video frames decoded in wrong order.
  Naive fix: Added sequence numbers to UDP packets — but reinvented TCP
  Better fix: Used WebRTC (which handles this properly) or switched to TCP for this use case
  Lesson: UDP's L4 "unreliable" is real — your L7 app must handle ordering/loss if it matters

BUG 5: Hardcoded port in firewall rule but service changed port
  Scenario: Payment service migrated from port 3000 to port 3001. All payments failed in prod.
  Root cause: iptables rule specifically allowed only port 3000. L4 firewall silently dropping 3001.
  The application (L7) was running fine — the transport layer (L4) was rejecting it
  Detection: ss -tlnp showed service listening on 3001; telnet failed on 3001 but worked on 3000
  Fix: Update firewall rule + use service discovery so port changes don't require manual rule updates
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE LAYER:
  For each scenario, identify which OSI layer has the problem:
  
  a) curl https://api.example.com returns "SSL_ERROR_HANDSHAKE_FAILURE"
     → Answer: Layer __ (hint: where does TLS live?)
  
  b) ping 8.8.8.8 works but ping google.com fails
     → Answer: Layer __ (hint: hostname vs IP address — what resolves names?)
  
  c) Your Ethernet interface shows "NO CARRIER" in ifconfig
     → Answer: Layer __ (hint: physical connection)
  
  d) HTTP request returns 403 Forbidden  
     → Answer: Layer __ (hint: HTTP status codes)
  
  e) TCP connection times out (no response at all, not "connection refused")
     → Answer: Layer __ (hint: silent drops, firewalls that don't send RST)

CHALLENGE 2 — FIX THE DEBUGGING APPROACH:
  Priya's Node.js app can't reach https://payments.internal:8443
  She's been modifying her Axios request headers for 3 hours.
  
  Write a systematic 5-step debugging script that checks each OSI layer bottom-up:
  1. Check Layer 3: Can we ping the IP?
  2. Check Layer 4: Can we establish TCP on port 8443?
  3. Check Layer 5/6: Does TLS handshake complete?
  4. Check Layer 7: Does HTTP request succeed?
  5. Report at which layer it fails with actionable fix suggestion
  
  Bonus: Make it async and output a clear diagnostic report

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a "Network Diagnosis Tool" CLI in Node.js that:
  
  Given a URL like "https://api.razorpay.com/v1/payments":
  1. Parses the URL → extracts protocol, hostname, port, path
  2. Resolves DNS → shows all IP addresses (A records)
  3. Tests TCP connectivity on the port → measures connection time in ms
  4. If HTTPS, performs TLS handshake → shows certificate subject, expiry, cipher used
  5. Makes the actual HTTP GET → shows status code, response time, key headers
  6. Outputs a table like:
     Layer  | Check              | Status | Latency
     -------|--------------------|---------|---------
     L3/DNS | DNS Resolution     | ✅ PASS | 12ms
     L4/TCP | TCP Handshake      | ✅ PASS | 45ms
     L6/TLS | TLS Handshake      | ✅ PASS | 112ms
     L7/HTTP| HTTP Request       | ✅ PASS | 230ms
  
  This tool maps exactly to OSI layers and is actually useful in production!
    `,
    summary: `The OSI model is not just theoretical — it's your debugging compass. When something breaks, start at Layer 1 and move up: physical → link → network → transport → session/presentation → application. Every protocol you use (TCP, TLS, HTTP, DNS) lives at a specific layer, and fixing the wrong layer wastes hours.`
  },

  {
    id: 2,
    title: "TCP Handshake & Connection Lifecycle",
    tag: "HOW THE INTERNET SAYS HELLO",
    color: "#059669",
    tldr: `TCP (Transmission Control Protocol) establishes a reliable, ordered, bidirectional connection using a 3-way handshake before any data flows. Every HTTP request, TLS connection, and WebSocket starts with this handshake. Understanding it explains connection latency, timeout errors, TIME_WAIT issues, and why the first request to a server is always slower.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
Bugs engineers regularly hit without understanding TCP:

1. "Why is the first API call in my app always slow?" 
   → TCP handshake + TLS handshake adds 150-300ms before byte 1 of data
   
2. "Why does my server have thousands of sockets in TIME_WAIT?"
   → TIME_WAIT state is intentional — closing TCP connections has a lifecycle
   
3. "Connection reset by peer" — what caused it and how to handle it?
   → Server sent RST (reset) — means TCP connection was abruptly killed
   
4. "Why does keep-alive matter for performance?"
   → Reusing TCP connections avoids repeated handshakes (RTT savings)
   
5. Half-open connections causing "connection hanging" in production
   → TCP doesn't know when the other side died unless it tries to send data

Without understanding TCP's state machine, these bugs are black boxes.
    `,
    analogy: `
THE PHONE CALL ANALOGY:
-----------------------
Establishing a TCP connection is like making a phone call:

3-WAY HANDSHAKE:
  Client → Server: "Ring ring... are you there?" (SYN — synchronize)
  Server → Client: "Yes! I hear you, can you hear ME?" (SYN-ACK — synchronize + acknowledge)
  Client → Server: "Yes! Let's talk." (ACK — acknowledge)
  [Data flows now — both sides confirmed they can hear each other]

4-WAY TERMINATION (when done):
  Client → Server: "I'm done talking." (FIN — finish)
  Server → Client: "OK I heard you're done." (ACK)
  Server → Client: "I'm done too." (FIN)  ← Server might still be sending data!
  Client → Server: "OK, bye!" (ACK)
  [Client waits in TIME_WAIT for 2×MSL = ~120 seconds before truly closing]

Why wait in TIME_WAIT? Imagine you say "bye" and hang up, but your "bye" got lost.
The other person says "bye" again — you need to still be "on the line" to confirm.
TIME_WAIT prevents old packets from a closed connection confusing a new one on the same port.

WHY 3-WAY AND NOT 2-WAY?
  2-way would be: "Hello" → "Hello back" — but then the FIRST person can't confirm 
  the second "Hello" arrived. With 3-way, both sides confirm BOTH directions work.
  A connection is bidirectional — each direction needs its own SYN + ACK.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — TCP INTERNALS:
------------------------------------------

TCP SEGMENT HEADER (key fields):
  - Source Port (16-bit): which process is sending
  - Destination Port (16-bit): which process to deliver to
  - Sequence Number (32-bit): byte offset of this data in the stream (starts random — ISN)
  - Acknowledgment Number (32-bit): "I've received everything up to byte N, send N+1 next"
  - Flags (9 bits): SYN, ACK, FIN, RST, PSH, URG, ECE, CWR, NS
  - Window Size (16-bit): how many bytes receiver can accept (flow control)
  - Checksum: integrity check

3-WAY HANDSHAKE IN DETAIL:
  Step 1 — SYN:
    Client picks a random ISN (Initial Sequence Number), e.g. ISN_C = 1000
    Client sends: [SYN, seq=1000] → "I want to start, my initial seq is 1000"
    Client state: SYN_SENT
    
  Step 2 — SYN-ACK:
    Server picks its own ISN, e.g. ISN_S = 5000
    Server sends: [SYN, ACK, seq=5000, ack=1001] → 
      "I got your seq 1000 (so ACK = 1000+1 = 1001), my seq is 5000"
    Server state: SYN_RECEIVED
    
  Step 3 — ACK:
    Client sends: [ACK, seq=1001, ack=5001] → 
      "I got your seq 5000 (so ACK = 5000+1 = 5001)"
    Client state: ESTABLISHED
    Server state: ESTABLISHED
    [Now both sides know each other's ISN and can send reliable ordered data]

WHY RANDOM ISN? Security — if ISN was predictable (0, 1, 2...) attackers could inject 
    TCP segments without being on the network path (TCP sequence prediction attack).

TCP STATE MACHINE:
  CLOSED → SYN_SENT → ESTABLISHED (client side opening)
  CLOSED → LISTEN → SYN_RECEIVED → ESTABLISHED (server side accepting)
  ESTABLISHED → FIN_WAIT_1 → FIN_WAIT_2 → TIME_WAIT → CLOSED (active close)
  ESTABLISHED → CLOSE_WAIT → LAST_ACK → CLOSED (passive close)

TIME_WAIT STATE:
  - Duration: 2 × MSL (Maximum Segment Lifetime) = typically 60-120 seconds
  - Why: Ensures final ACK reaches server; prevents old packets confusing new connections
  - Problem: High-traffic servers can exhaust ephemeral ports (TIME_WAIT accumulation)
  - Socket in TIME_WAIT: (client_ip, client_port, server_ip, server_port) 4-tuple is blocked
  - Fix options:
    → SO_REUSEADDR socket option (allows bind to port in TIME_WAIT)
    → Reduce net.ipv4.tcp_fin_timeout (Linux kernel parameter)
    → Connection pooling (reuse connections, avoid closing)
    → Server initiates close (server-side TIME_WAIT is less problematic than client)

TCP RELIABILITY MECHANISMS:
  
  1. SEQUENCE NUMBERS + ACK:
     Every byte has a sequence number. Receiver ACKs received bytes.
     Unacknowledged data is retransmitted after timeout (RTO — Retransmission Timeout).
  
  2. SLIDING WINDOW (Flow Control):
     Receiver advertises "window size" = how much buffer space available.
     Sender cannot send more bytes than window allows.
     If window = 0, sender stops (Zero Window Probe keeps it alive).
  
  3. CONGESTION CONTROL (Protecting the network):
     Slow Start: Begin with cwnd (congestion window) = 1 MSS, double each RTT
     Congestion Avoidance: When ssthresh reached, grow by 1 MSS per RTT (additive)
     On packet loss: ssthresh = cwnd/2, restart slow start (multiplicative decrease)
     TCP Reno, CUBIC, BBR — different algorithms, different behaviors
  
  4. RETRANSMISSION:
     RTO (Retransmission Timeout): Wait 1-2 seconds, resend unacknowledged segment
     Fast Retransmit: 3 duplicate ACKs → retransmit immediately (don't wait for RTO)
     Selective ACK (SACK): "I got bytes 1-100 and 200-300 but not 101-199" → targeted retransmit

TCP vs UDP TRADEOFFS:
  TCP: Reliable, ordered, congestion-controlled — adds 1.5 RTT latency minimum
  UDP: Unreliable, unordered, no congestion control — minimum overhead
  QUIC (HTTP/3): Reliable ordered streams OVER UDP — avoids TCP's head-of-line blocking

SYN FLOOD ATTACK & SYN COOKIES:
  Attack: Attacker sends millions of SYN packets with fake source IPs
  Server allocates memory for each SYN, fills backlog queue → legitimate connections rejected
  Defense: SYN Cookies — encode connection state INTO the ISN (seq number)
    Server doesn't allocate state until ACK arrives with valid cookie
    Linux: net.ipv4.tcp_syncookies = 1

KEEP-ALIVE:
  Problem: TCP doesn't know if remote end died (no data flow = no detection)
  TCP Keep-Alive: After idle_time, send a probe every interval, give up after count probes
  Linux defaults: idle=7200s (2 hours!), interval=75s, count=9
  Application-level keep-alive (HTTP keep-alive, WebSocket ping) is usually better
    `,
    code: `
// ===== TCP HANDSHAKE & LIFECYCLE — CODE EXAMPLES =====

// EXAMPLE 1: Basic TCP server — seeing the handshake happen
const net = require('net');

const server = net.createServer((socket) => {
  // By the time this callback fires, 3-way handshake is COMPLETE
  // TCP ESTABLISHED state — ready to exchange data
  console.log(\`New connection from \${socket.remoteAddress}:\${socket.remotePort}\`);
  console.log(\`Local: \${socket.localAddress}:\${socket.localPort}\`);
  
  socket.on('data', (data) => {
    console.log('Received:', data.toString());
    socket.write('ACK: ' + data); // Send data back
  });
  
  socket.on('end', () => {
    // Remote sent FIN — they're done sending (but connection still half-open)
    console.log('Remote closed their side (FIN received)');
  });
  
  socket.on('close', () => {
    // Full 4-way FIN complete, socket fully closed
    console.log('Connection fully closed');
  });
  
  socket.on('error', (err) => {
    // RST received, or network error
    console.error('Socket error:', err.message); // ECONNRESET = RST from peer
  });
});

server.listen(8080, () => console.log('TCP server listening on :8080'));

// EXAMPLE 2: TCP client with connection timing
const net2 = require('net');

async function measureTcpHandshake(host, port) {
  return new Promise((resolve, reject) => {
    const start = process.hrtime.bigint();
    
    const client = net2.createConnection({ host, port }, () => {
      const elapsed = Number(process.hrtime.bigint() - start) / 1e6; // ms
      console.log(\`TCP handshake to \${host}:\${port} took \${elapsed.toFixed(2)}ms\`);
      // This time = 1 RTT (Round Trip Time) to server
      // SYN sent → SYN-ACK received → ACK sent (essentially 1 RTT)
      resolve(elapsed);
      client.destroy();
    });
    
    client.on('error', reject);
    client.setTimeout(5000, () => {
      reject(new Error('TCP handshake timeout — possible firewall'));
      client.destroy();
    });
  });
}

measureTcpHandshake('google.com', 443).then(ms => 
  console.log(\`First HTTPS request will cost \${ms + 100}ms+ before first byte\`)
); // TCP + TLS both add latency

// EXAMPLE 3: Connection pooling — AVOIDING repeated handshakes (production pattern)
// HTTP Keep-Alive and connection pools reuse TCP connections
const https = require('https');
const http2 = require('http2');

// BAD: Each request creates new TCP connection (handshake each time)
function slowApproach() {
  // Each https.get() creates a new socket → SYN → SYN-ACK → ACK → TLS → REQUEST
  // For 100 API calls: 100 × (TCP handshake + TLS handshake) latency
}

// GOOD: Reuse connections with agent (HTTP keep-alive)
const agent = new https.Agent({
  keepAlive: true,          // Don't close TCP connection after each request
  maxSockets: 10,           // Max 10 concurrent connections to same host
  keepAliveMsecs: 30000,    // Send TCP keep-alive probes every 30s
  timeout: 5000,            // Connection timeout
});

function fastApproach(path) {
  return new Promise((resolve, reject) => {
    https.get(\`https://api.example.com\${path}\`, { agent }, (res) => {
      // TCP connection REUSED from pool — no handshake!
      // Only 1 RTT for the HTTP request itself
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    }).on('error', reject);
  });
}

// EXAMPLE 4: TCP socket states — monitoring with ss command
// Run in bash to see real socket states:
/*
  ss -tnp  (show TCP socket states with process names)
  
  Common states you'll see:
  LISTEN      — server waiting for SYN (bind + listen called)
  ESTABLISHED — active connection, data flowing
  TIME_WAIT   — waiting 2×MSL after sending last ACK (our side initiated close)
  CLOSE_WAIT  — remote sent FIN, we've ACKed it, but our app hasn't closed socket yet
  SYN_SENT    — we sent SYN, waiting for SYN-ACK
  
  High TIME_WAIT count is normal for busy servers
  High CLOSE_WAIT count = BUG — app not calling socket.close() / res.end()
  
  To see counts:
  ss -s  (shows count by state)
*/

// EXAMPLE 5: Detecting CLOSE_WAIT bug (common production issue)
// CLOSE_WAIT happens when remote side closes connection, but YOUR code doesn't close socket
const http = require('http');

// BUG: Not ending the response causes CLOSE_WAIT
function buggyHandler(req, res) {
  // Oops — if an error occurs before res.end(), socket stays in CLOSE_WAIT
  if (someCondition) {
    res.writeHead(500);
    // MISSING res.end() — socket never closes properly!
    // Each request that hits this path leaks a socket in CLOSE_WAIT
    return;
  }
  res.end('OK');
}

// FIX: Always end response
function fixedHandler(req, res) {
  try {
    res.writeHead(200);
    res.end('OK');
  } catch (err) {
    if (!res.headersSent) res.writeHead(500);
    res.end('Internal Server Error'); // Always call end!
  }
}

// EXAMPLE 6: TCP SYN timeout vs Connection Refused — different errors
async function diagnoseError(host, port) {
  const net3 = require('net');
  return new Promise((resolve) => {
    const sock = net3.createConnection({ host, port });
    
    sock.on('connect', () => {
      resolve({ status: 'CONNECTED', meaning: 'Port open, service running' });
      sock.destroy();
    });
    
    sock.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        // Server sent RST immediately — port NOT listening
        // Machine is reachable but nothing is on that port
        resolve({ status: 'REFUSED', meaning: 'Host up, port NOT listening (service down/wrong port)' });
      } else if (err.code === 'ETIMEDOUT') {
        // SYN sent, no response — firewall silently dropping packets
        resolve({ status: 'TIMEOUT', meaning: 'Firewall dropping packets or host unreachable' });
      } else if (err.code === 'ENOTFOUND') {
        // DNS failed — didn't even get to TCP layer
        resolve({ status: 'DNS_FAIL', meaning: 'Hostname cannot be resolved (Layer 3/7 issue)' });
      } else {
        resolve({ status: 'ERROR', meaning: err.message });
      }
    });
    
    sock.setTimeout(3000, () => {
      sock.destroy(new Error('timeout'));
    });
  });
}

// EXAMPLE 7: SO_REUSEADDR — bind to port even in TIME_WAIT (server restart)
// In Node.js, servers automatically use SO_REUSEADDR
// But understanding when it matters:
/*
  Without SO_REUSEADDR:
    Server crashes → restart → bind() to port 8080 → FAILS: "Address already in use"
    (Old socket still in TIME_WAIT state)
  
  With SO_REUSEADDR (Node.js default for TCP servers):
    Server restarts → can rebind to same port even if old socket is in TIME_WAIT
    Multiple processes can bind same port only with SO_REUSEPORT (different from REUSEADDR)
*/
server.listen({ port: 8080, host: '0.0.0.0', reusePort: false }, () => {
  console.log('Server restarted, bound to port 8080 (old TIME_WAIT sockets ignored)');
});
    `,
    bugs: `
REAL PRODUCTION BUGS FROM TCP MISUNDERSTANDING:
-------------------------------------------------

BUG 1: CLOSE_WAIT socket leak — "Too many open files" after hours of uptime
  Scenario: Vikram's Express.js API worked fine for 2 hours then died with EMFILE error
  Root cause: A code path inside error handler called res.writeHead() but forgot res.end()
    Each request hitting that path left socket in CLOSE_WAIT indefinitely
    Over time, open file descriptors (each socket = 1 FD) exceeded OS limit (ulimit -n)
  Detection: ss -s showed 50,000+ sockets in CLOSE_WAIT
  Fix: 
    1. Always call res.end() — wrap in try/finally if needed
    2. Increase FD limits as temp fix: ulimit -n 65535
    3. Add socket timeout: server.setTimeout(30000, (socket) => socket.destroy())
  Prevention: Linting rules that check res.end() is always called

BUG 2: TIME_WAIT port exhaustion on load testing environment
  Scenario: Load test of Priya's API hit 50k RPS → started failing with EADDRINUSE
  Root cause: Test client making new TCP connection per request → short-lived connections
    Closed connections enter TIME_WAIT for 60-120 seconds
    At 50k RPS × 60s = 3 million sockets needed! Exceeded ephemeral port range (60k ports)
  Detection: ss -s showed 60,000+ TIME_WAIT. netstat -an | grep TIME_WAIT | wc -l
  Fix:
    1. Enable connection keep-alive (reuse connections — primary fix)
    2. Reduce TIME_WAIT duration: sysctl -w net.ipv4.tcp_fin_timeout=15
    3. Enable TIME_WAIT reuse: sysctl -w net.ipv4.tcp_tw_reuse=1
    4. Increase port range: sysctl -w net.ipv4.ip_local_port_range="1024 65535"

BUG 3: Half-open connections causing request hangs
  Scenario: App connecting to database — sometimes requests hung indefinitely
  Root cause: DB server crashed mid-connection. TCP on client side didn't know (no data was flowing).
    TCP keep-alive default is 2 HOURS — client thought connection was alive for 2 hours
  Fix: Set application-level keepalive + connect timeout on DB client:
    // PostgreSQL example:
    const pool = new Pool({
      connectionTimeoutMillis: 5000,  // Timeout if can't connect in 5s
      idleTimeoutMillis: 30000,       // Close idle connections after 30s
      // Enable TCP keep-alive:
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

BUG 4: Misunderstanding "Connection reset by peer" (ECONNRESET)
  Scenario: Random ECONNRESET errors in production, hard to reproduce
  Wrong assumption: "Must be a bug in our code"
  Root causes (multiple possible):
    a) Load balancer idle timeout: LB closed idle connection, but client didn't know
    b) Server process restarted mid-request: sent RST to all open connections
    c) Client sent more data after server closed socket
  Fix:
    a) Set HTTP keep-alive timeout slightly LESS than load balancer timeout
       AWS ALB default idle timeout = 60s → set server keepAliveTimeout = 55000ms
    b) Graceful shutdown: stop accepting new connections, wait for existing to drain
    c) Handle ECONNRESET in HTTP client — retry idempotent requests

BUG 5: SYN packet dropped → 1 second delay on every new connection to a specific host
  Scenario: Connections to a Redis server always took exactly 1 second to establish
  Root cause: First SYN packet was being dropped (firewall rate limiting)
    TCP SYN retransmission timer: 1 second (first retransmit after SYN loss)
    Second SYN succeeded immediately → total ~1 second delay
  Detection: tcpdump showing SYN sent, then 1s pause, then SYN again, then SYN-ACK
  Fix: Identified firewall rate limiting new connections. Added security group exception.
  Lesson: Exact 1-second (or 3-second, 7-second — powers of 2) connection delays = TCP retransmit
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE STATE:
  Given this sequence of events, what TCP state is the client socket in at each step?
  
  1. Client calls connect() but hasn't received SYN-ACK yet
     State: __________
  
  2. 3-way handshake complete, data flowing
     State: __________
  
  3. Client calls socket.end() — FIN sent, server sent ACK but not its own FIN yet
     State: __________
  
  4. Server sent its FIN, client sent final ACK
     State: __________ (client will stay here for 2×MSL)
  
  5. Server received FIN from client, but server's app hasn't called close() yet
     State: __________ (this is the "leak" state to watch for!)
  
  Answers: SYN_SENT, ESTABLISHED, FIN_WAIT_2, TIME_WAIT, CLOSE_WAIT

CHALLENGE 2 — FIX THE BUG:
  This HTTP server leaks sockets. Find all issues and fix them:
  
  const http = require('http');
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200);
      // BUG 1: Missing res.end()
      return;
    }
    
    fetchData().then(data => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.write(JSON.stringify(data));
      // BUG 2: Missing res.end() after res.write()
    }).catch(err => {
      res.writeHead(500);
      // BUG 3: Missing res.end() in error path
    });
  });
  
  server.listen(3000);
  // BUG 4: No server.keepAliveTimeout set (default Infinity — LB will reset it)
  // BUG 5: No server.headersTimeout set

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a TCP connection pool in Node.js that:
  
  1. Maintains N persistent TCP connections to a server
  2. On request: picks an idle connection from pool (or waits if all busy)
  3. Sends data and returns response
  4. Returns connection to pool after use
  5. Detects dead connections (half-open) by sending a heartbeat every 30s
  6. Replaces dead connections automatically
  7. Exposes metrics: pool size, in-use count, connection age, heartbeat failures
  
  This is essentially what database connection pools do.
  Hint: Use EventEmitter for connection lifecycle events.
  Bonus: Implement exponential backoff for reconnection attempts.
    `,
    summary: `TCP's 3-way handshake guarantees both sides are ready before data flows, but this reliability has a cost: 1 RTT minimum latency, TIME_WAIT state on close, and half-open connection risks. Master connection pooling (reuse connections) and proper socket lifecycle management (always close sockets, handle all error events) to build production-grade networked applications.`
  },

  {
    id: 3,
    title: "TLS 1.3 & Certificate Chains",
    tag: "THE ENVELOPE THAT NOBODY CAN OPEN",
    color: "#DC2626",
    tldr: `TLS (Transport Layer Security) 1.3 encrypts all data in transit, preventing eavesdropping and man-in-the-middle attacks. It establishes encryption in 1 RTT (half the time of TLS 1.2) using a certificate chain to prove server identity, ephemeral key exchange for perfect forward secrecy, and symmetric encryption for actual data. Understanding TLS explains HTTPS, certificate errors, HSTS, OCSP stapling, and mTLS.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"NET::ERR_CERT_AUTHORITY_INVALID" — what does this actually mean?
"Your connection is not private" — which attack does this prevent?
"SSL handshake failed" in API calls — where to even start debugging?
"Should I pin certificates in my mobile app?"
"What is OCSP and why does my TLS sometimes have extra latency?"

TLS is one of the most misunderstood layers in production systems:
  - Devs treat it as a black box until it breaks
  - Certificate chain errors are confusing without mental model
  - TLS 1.2 vs 1.3 performance difference matters at scale
  - mTLS (mutual TLS) is increasingly required for service mesh / zero trust
  - Certificate rotation is a common cause of production outages (cert expiry)
    `,
    analogy: `
THE SEALED LETTER WITH NOTARIZED ID ANALOGY:
--------------------------------------------
Imagine you want to send a secret letter to your bank, but you've never met them.

WITHOUT TLS (HTTP):
  You write your letter (bank password) on a postcard.
  Anyone along the postal route can read it.
  Anyone can REPLACE your postcard with their own.

WITH TLS — STEP BY STEP:

1. CERTIFICATE (Server Identity):
   The bank holds a "Notarized ID" — a certificate saying 
   "This is HDFC Bank (www.hdfcbank.com)" signed by a trusted notary 
   (Certificate Authority like DigiCert or Let's Encrypt).
   
   Your browser/OS has a built-in list of TRUSTED notaries (Root CAs).
   If HDFC's cert is signed by a Root CA you trust → you trust HDFC's identity.

2. CERTIFICATE CHAIN (Chain of Trust):
   Root CAs don't sign websites directly (too risky — if root key leaks, all certs compromised).
   Instead: Root CA → signs → Intermediate CA → signs → End-Entity Cert (HDFC)
   Your browser verifies: HDFC cert → signed by Intermediate CA → signed by Root CA → I trust this!

3. KEY EXCHANGE (TLS 1.3 — 1-RTT):
   Client: "I support these cipher suites, here's my temporary public key" (ClientHello)
   Server: "Use this cipher, here's MY cert + my temporary public key, I'm done!" (ServerHello + Finished)
   Both sides now derive the same shared secret (Diffie-Hellman magic)
   Client: "I'm done too. Here's the first encrypted data." 
   [Handshake complete in 1 RTT — TLS 1.2 needed 2 RTT!]

4. SYMMETRIC ENCRYPTION (AES-GCM):
   After key exchange, both sides use the same secret key for fast symmetric encryption
   Your letter is now locked in a box that ONLY you and HDFC can open
   Every byte of your request/response is encrypted

5. PERFECT FORWARD SECRECY:
   TLS 1.3 uses EPHEMERAL Diffie-Hellman keys (new keys per session!)
   Even if attacker records all traffic AND later steals the server's private key →
   they CANNOT decrypt past sessions (keys are gone)
   TLS 1.2 without DHE: steal server's private key once → decrypt ALL recorded traffic
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — TLS 1.3 INTERNALS:
-----------------------------------------------

TLS 1.3 HANDSHAKE (RFC 8446):
  
  1. ClientHello:
     - Supported cipher suites: TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256
     - Supported groups (key exchange): x25519, secp256r1 (for Diffie-Hellman)
     - Key shares: Client immediately sends its DH public key (no need for server to ask)
     - SNI (Server Name Indication): which hostname client wants (allows virtual hosting TLS)
     - Session ticket (if resuming previous session → 0-RTT possible!)
     
  2. ServerHello + (EncryptedExtensions + Certificate + CertificateVerify + Finished):
     - Server picks cipher suite
     - Server's DH public key (both sides can now compute shared secret!)
     - Server's certificate chain
     - CertificateVerify: signature proving server has the private key for the cert
     - Finished: HMAC of all handshake messages (integrity proof)
     - EVERYTHING after ServerHello is ENCRYPTED (unlike TLS 1.2!)
     
  3. Client verifies:
     - Certificate chain → all certs signed correctly up to trusted Root CA
     - Cert hostname matches SNI (CN or SAN field)
     - Cert not expired (notBefore/notAfter)
     - Cert not revoked (OCSP check)
     - CertificateVerify signature valid
     
  4. Client sends Finished
     [Handshake done — 1 RTT!]
     [0-RTT resumption possible with session tickets — but replay attack risk]

CERTIFICATE ANATOMY (X.509):
  - Subject: CN=www.hdfc.com (Common Name) or SAN (Subject Alternative Names)
  - Issuer: O=DigiCert Inc, CN=DigiCert SHA2 Secure Server CA
  - Serial Number: unique per CA
  - Valid From / Valid To: notBefore / notAfter
  - Public Key: RSA 2048/4096 or EC P-256 or Ed25519
  - Signature: CA's digital signature over all the above
  - Extensions: 
    - Key Usage: Digital Signature, Key Encipherment
    - Extended Key Usage: TLS Web Server Authentication
    - Subject Alternative Names: lists ALL valid domains (www.example.com, example.com, api.example.com)
    - CRL Distribution Points: URL to check if cert is revoked
    - OCSP Stapling: server embeds OCSP response in TLS handshake
    - Basic Constraints: isCA=true (only for CA certs)

CERTIFICATE CHAIN VALIDATION:
  Root CAs are pre-installed in OS/browser (built-in trust store)
  Linux: /etc/ssl/certs/    macOS: Keychain   Windows: Certificate Manager   
  Browser: Chrome uses its own cert store (not OS on some platforms)
  
  Chain: end-entity cert → intermediate CA cert → root CA cert
  Server MUST send intermediate cert (root is in trust store already)
  Common bug: Server sends only end-entity cert — browsers work (fetch intermediate via AIA)
    but curl/wget/Node.js fails because they don't auto-fetch intermediates
  
  Validation steps per cert in chain:
    1. Check signature: was this cert signed by the next cert in chain?
    2. Check validity period: is today between notBefore and notAfter?
    3. Check revocation: OCSP or CRL (is this cert revoked?)
    4. Check name constraints: is subject/SAN valid for this CA?
    5. Check key usage: is cert allowed to sign other certs? (isCA=true)

OCSP (Online Certificate Status Protocol):
  Problem: How does browser know if cert was REVOKED before expiry?
    (Revocation: CA/domain owner says "this cert is compromised, don't trust it")
  
  OCSP: Browser queries OCSP responder (usually CA's server): "Is cert serial 1234 valid?"
  OCSP response: "Good" / "Revoked" / "Unknown"
  
  Problem with OCSP: Adds 100-300ms latency to EVERY new TLS connection (OCSP request)
    Also: OCSP responder down → should we fail open (risk) or fail closed (breaks browsing)?
    Also: Privacy — CA learns EVERY website you visit!
  
  OCSP STAPLING (Fix):
    Server fetches OCSP response for its OWN cert every few hours
    Server "staples" the signed OCSP response INTO the TLS handshake
    No extra round trip for client!
    OCSP response is signed by CA → client can verify it
    Enable in nginx: ssl_stapling on; ssl_stapling_verify on;

HSTS (HTTP Strict Transport Security):
  Header: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Effect: Browser NEVER uses HTTP for this domain — always upgrades to HTTPS
  Duration: max-age seconds (1 year = 31536000)
  includeSubDomains: applies to *.example.com too
  preload: submit to browsers' built-in HSTS preload list (hard-coded in Chrome/Firefox)
  
  Prevents: SSL stripping attacks (downgrade HTTP→ attacker intercepts)
  
  HSTS Gotcha: If cert becomes invalid and HSTS is active, users literally CANNOT access site
    → No "proceed anyway" button!
    → Always test cert renewal BEFORE enabling HSTS preload

mTLS (Mutual TLS):
  Normal TLS: Server proves identity to client (via cert)
  mTLS: BOTH sides prove identity (client also sends a cert)
  
  Use cases:
    - Service-to-service auth in microservices (zero trust networking)
    - API clients (banks requiring client certs — RBI mandates this for some APIs)
    - IoT device authentication
    - VPN (some implementations)
  
  How it works: Server sends CertificateRequest during handshake
    Client sends its cert + CertificateVerify
    Server validates client cert against its trusted CA list
  
  Istio/Envoy service mesh can inject mTLS transparently into all service communication

CIPHER SUITES in TLS 1.3 (only 5, vs 37 in TLS 1.2):
  TLS_AES_128_GCM_SHA256        (AES 128-bit, GCM mode, SHA256)
  TLS_AES_256_GCM_SHA384        (AES 256-bit, GCM mode, SHA384) 
  TLS_CHACHA20_POLY1305_SHA256  (ChaCha20, mobile-friendly, faster without AES hardware)
  TLS_AES_128_CCM_SHA256
  TLS_AES_128_CCM_8_SHA256
  
  Key insight: In TLS 1.3, cipher suite ONLY specifies:
    - Symmetric encryption algorithm (AES-GCM, ChaCha20)
    - Hash function (SHA256, SHA384)
  Key exchange (ECDHE) is ALWAYS used — perfect forward secrecy is mandatory in TLS 1.3!
    `,
    code: `
// ===== TLS 1.3 & CERTIFICATES — CODE EXAMPLES =====

// EXAMPLE 1: HTTPS server with TLS in Node.js
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('/etc/ssl/private/server.key'),        // Private key (NEVER share!)
  cert: fs.readFileSync('/etc/ssl/certs/server.crt'),         // End-entity certificate
  ca: fs.readFileSync('/etc/ssl/certs/intermediate.crt'),     // Intermediate CA cert
  
  // TLS 1.3 only (most secure):
  minVersion: 'TLSv1.3',
  
  // Or allow TLS 1.2+ for broader compatibility:
  // minVersion: 'TLSv1.2',
  // ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES256-GCM-SHA384',
  
  // HSTS is set via response header, not TLS option:
};

https.createServer(options, (req, res) => {
  // Enforce HSTS — browser won't use HTTP for this domain for 1 year
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.end('Secure response');
}).listen(443);

// EXAMPLE 2: Inspecting TLS certificate details
const tls = require('tls');

function inspectCertificate(hostname, port = 443) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: hostname, port, servername: hostname }, () => {
      const cert = socket.getPeerCertificate(true); // true = get full chain
      const protocol = socket.getProtocol();         // TLSv1.3, TLSv1.2 etc.
      const cipher = socket.getCipher();             // { name, version }
      
      console.log('TLS Version:', protocol);
      console.log('Cipher:', cipher.name);
      console.log('Subject:', cert.subject.CN || cert.subject.O);
      console.log('Issuer:', cert.issuer.O);
      console.log('SANs:', cert.subjectaltname); // 'DNS:example.com, DNS:www.example.com'
      console.log('Valid From:', cert.valid_from);
      console.log('Valid To:', cert.valid_to);
      
      // Check days until expiry
      const expiry = new Date(cert.valid_to);
      const daysLeft = Math.floor((expiry - Date.now()) / (1000 * 60 * 60 * 24));
      console.log(\`Cert expires in: \${daysLeft} days\`);
      if (daysLeft < 30) console.warn('⚠️  CERT EXPIRES SOON — schedule renewal!');
      if (daysLeft < 7)  console.error('🚨 CERT EXPIRES IN LESS THAN A WEEK!');
      
      resolve({ protocol, cipher, daysLeft, subject: cert.subject });
      socket.end();
    });
    
    socket.on('error', (err) => {
      if (err.code === 'CERT_HAS_EXPIRED')       reject(new Error('Certificate expired!'));
      else if (err.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') 
        reject(new Error('Certificate chain broken — intermediate CA missing'));
      else if (err.code === 'HOSTNAME_MISMATCH') reject(new Error('Cert CN does not match hostname'));
      else reject(err);
    });
  });
}

inspectCertificate('google.com').catch(console.error);

// EXAMPLE 3: mTLS — client sending its own certificate
const options_mtls = {
  host: 'api.bank.example.com',
  port: 443,
  servername: 'api.bank.example.com',
  
  // Server cert verification (normal TLS)
  ca: fs.readFileSync('/path/to/bank-ca.crt'),     // Bank's CA cert to trust
  
  // Client cert (mTLS — we prove OUR identity)
  key:  fs.readFileSync('/path/to/client.key'),    // Our private key
  cert: fs.readFileSync('/path/to/client.crt'),    // Our certificate (signed by bank's CA)
  
  checkServerIdentity: (hostname, cert) => {
    // Custom hostname verification if needed
    // Return undefined = OK, throw error = fail
    if (cert.subject.CN !== 'api.bank.example.com') {
      throw new Error(\`Unexpected CN: \${cert.subject.CN}\`);
    }
  }
};

const mtlsSocket = tls.connect(options_mtls, () => {
  console.log('mTLS connection established');
  console.log('Server authorized us:', mtlsSocket.authorized);
  // Now make HTTP requests over this mTLS connection
});

// EXAMPLE 4: Certificate monitoring — alert before expiry (production essential!)
const tls2 = require('tls');

async function monitorCerts(domains) {
  const alerts = [];
  
  for (const domain of domains) {
    try {
      const socket = await new Promise((resolve, reject) => {
        const s = tls2.connect({ host: domain, port: 443, servername: domain }, 
          () => resolve(s));
        s.on('error', reject);
        s.setTimeout(5000, () => reject(new Error('timeout')));
      });
      
      const cert = socket.getPeerCertificate();
      const expiry = new Date(cert.valid_to);
      const days = Math.floor((expiry - Date.now()) / 86400000);
      
      socket.end();
      
      if (days < 14) alerts.push({ domain, days, severity: 'CRITICAL' });
      else if (days < 30) alerts.push({ domain, days, severity: 'WARNING' });
      
    } catch (err) {
      alerts.push({ domain, error: err.message, severity: 'ERROR' });
    }
  }
  
  // Send alerts to Slack/PagerDuty if any found
  if (alerts.length > 0) {
    console.error('CERTIFICATE ALERTS:', JSON.stringify(alerts, null, 2));
    // await sendSlackAlert(alerts);
  }
  
  return alerts;
}

// Run daily via cron:
monitorCerts(['api.myapp.com', 'admin.myapp.com', 'payments.myapp.com']);

// EXAMPLE 5: Disabling cert verification — the DANGEROUS shortcut
// You'll see this in codebases — NEVER do this in production!

// BAD — disables ALL certificate verification (MitM attacks possible):
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // 🚫 NEVER do this

// BAD — same, per-request:
fetch('https://api.example.com', {
  // agent: new https.Agent({ rejectUnauthorized: false }) // 🚫 NEVER
});

// GOOD — trust a specific self-signed cert:
const goodAgent = new (require('https').Agent)({
  ca: fs.readFileSync('/path/to/self-signed-cert.crt'), // Trust ONLY this cert
  // rejectUnauthorized: true (default) — still validates, but against our custom CA
});

// EXAMPLE 6: TLS session resumption (0-RTT) — with replay attack warning
// TLS 1.3 supports 0-RTT (zero round trips) for resuming sessions
// Client sends data along with first message — server can process before completing handshake
/*
  0-RTT is great for: GET requests, read-only operations
  0-RTT is DANGEROUS for: POST, DELETE, payment operations
  Why? Replay attacks: network attacker can re-send the 0-RTT ClientHello
    → server processes the request TWICE (e.g., charge ₹500 twice!)
  
  Solution: Don't enable 0-RTT for non-idempotent operations
  Or: Include a server-side nonce/timestamp and reject replays
  
  nginx config: ssl_early_data off; // Disable 0-RTT (safer default)
*/

// EXAMPLE 7: Certificate pinning (mobile apps / high-security APIs)
// Hardcode expected certificate fingerprint — even valid certs from other CAs are rejected
function checkCertPin(socket, expectedSHA256Fingerprint) {
  const cert = socket.getPeerCertificate();
  const actualFingerprint = cert.fingerprint256; // 'AA:BB:CC:...'
  
  if (actualFingerprint !== expectedSHA256Fingerprint) {
    socket.destroy();
    throw new Error(\`Certificate pinning FAILED! Expected \${expectedSHA256Fingerprint}, 
      got \${actualFingerprint}. Possible MitM attack!\`);
  }
  
  console.log('Certificate pin verified ✓');
}
// Risk: Cert renewal changes fingerprint → app breaks until updated
// Better: Pin the public key (SPKI) not the full cert — survives cert renewal
    `,
    bugs: `
REAL PRODUCTION BUGS FROM TLS MISUNDERSTANDING:
-------------------------------------------------

BUG 1: Certificate expiry taking down production (₹50L/hour revenue impact)
  Scenario: Payment API cert expired at 2 AM. All payment requests failed with SSL error.
  All monitoring showed "service healthy" because health checks used HTTP (no TLS!)
  Root cause: No certificate expiry monitoring. Let's Encrypt 90-day certs need auto-renewal.
  Fix:
    1. Deploy certbot with systemd timer / cron for auto-renewal
    2. Monitor cert expiry: daily cron job to check all domains
    3. Alert at 30 days → 14 days → 7 days (escalating severity)
    4. Health checks should use HTTPS same as clients
  Code: Add cert expiry monitoring from Example 4 above to all production services

BUG 2: Intermediate CA cert missing from server — works in Chrome, fails in curl
  Scenario: API worked in browser but all backend-to-backend calls (Node.js, Python) failed
    with "unable to verify the first certificate"
  Root cause: Server was sending ONLY the end-entity cert (not the full chain including intermediate)
    Browsers: auto-fetch intermediate via AIA (Authority Information Access) extension — so worked
    curl/Node.js: doesn't auto-fetch → chain broken → validation fails
  Fix: In nginx: ssl_certificate should be fullchain.pem (cert + intermediate + root chain)
    Let's Encrypt: use fullchain.pem NOT cert.pem
    Check: openssl s_client -connect api.example.com:443 -showcerts

BUG 3: Wildcard cert not matching subdomain of subdomain
  Scenario: api.payments.myapp.com failed TLS validation. Cert said *.myapp.com.
  Root cause: Wildcard cert *.myapp.com matches ONE level: www.myapp.com, api.myapp.com
    It does NOT match api.payments.myapp.com (two levels deep)
  Fix: Get a wildcard cert *.payments.myapp.com OR add the domain to SAN extension
    Modern certs use SANs — add all required domains: api.myapp.com, api.payments.myapp.com

BUG 4: NODE_TLS_REJECT_UNAUTHORIZED=0 left in production code
  Scenario: Dev set this env var to bypass self-signed cert in dev. Config deployed to prod.
  Impact: ALL TLS verification disabled in production. MitM attacks possible.
    Outbound requests to payment APIs, email services, databases — all unverified!
  Detection: grep -r "REJECT_UNAUTHORIZED" in codebase; audit env vars
  Fix: 
    - Never use REJECT_UNAUTHORIZED=0 in any environment (use proper CA setup)
    - For dev with self-signed certs: mount the CA cert and trust it specifically
    - CI/CD lint check: flag any use of REJECT_UNAUTHORIZED

BUG 5: Certificate pinning breaking app after cert renewal
  Scenario: Mobile banking app pinned exact certificate fingerprint.
    Annual cert renewal changed fingerprint → app couldn't connect for users who hadn't updated
    (30% of users on old app version = complete outage for them)
  Fix: 
    1. Pin the SPKI (Subject Public Key Info) fingerprint, not the full cert
       → Key stays same on renewal if you don't change key pair
    2. Include TWO pins: current cert + backup cert (next cert to be deployed)
    3. Use multi-cert strategy: deploy new cert weeks before old expires, pin both
    Lesson: Certificate pinning is advanced — have a rollback plan BEFORE deploying
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE ERROR:
  Match each TLS error to its root cause:
  
  Error A: ERR_CERT_AUTHORITY_INVALID
  Error B: ERR_CERT_DATE_INVALID  
  Error C: ERR_CERT_COMMON_NAME_INVALID
  Error D: UNABLE_TO_VERIFY_LEAF_SIGNATURE
  Error E: DEPTH_ZERO_SELF_SIGNED_CERT
  
  Causes (match them):
  1. Accessing https://api.example.com with cert that says CN=www.example.com
  2. Self-signed cert in development — no CA signed it
  3. Certificate expired 3 days ago
  4. Server sent cert but not the intermediate CA cert needed to verify it  
  5. Cert signed by a CA that's not in the browser's trusted store

CHALLENGE 2 — FIX THE CODE:
  This code has 3 TLS security bugs. Find and fix all three:
  
  const https = require('https');
  
  // Bug 1: 
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  // Bug 2:
  const server = https.createServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.crt'),
    // Only TLS 1.2+ allowed but this is wrong:
    secureProtocol: 'TLSv1_method', // This forces TLS 1.0!
  });
  
  // Bug 3:
  server.on('request', (req, res) => {
    // Missing HSTS header
    res.end('Hello');
  });
  
  Provide fixed version with explanations.

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a "TLS Health Dashboard" for a list of production domains:
  
  Input: ['api.myapp.com', 'admin.myapp.com', 'payments.myapp.com', 'cdn.myapp.com']
  
  For each domain, collect:
    - TLS version (TLSv1.2 or TLSv1.3)
    - Cipher suite
    - Certificate subject and SANs
    - Days until expiry
    - Whether OCSP stapling is active (check for OCSP response in handshake)
    - Whether HSTS header is present and its max-age
    - HTTP→HTTPS redirect (does port 80 redirect to 443?)
  
  Output a formatted table + JSON report.
  Highlight any domain with:
    - TLS version below 1.3 (warning)
    - Cert expiring in < 30 days (critical)
    - Missing HSTS (warning)
    - No HTTPS redirect (warning)
  
  This is a real production tool used by security teams!
    `,
    summary: `TLS 1.3 reduces the handshake to 1 RTT, mandates perfect forward secrecy, and encrypts more of the handshake. The critical operational skills are: always serve the full certificate chain (not just end-entity cert), monitor expiry proactively, set HSTS headers, and never disable certificate verification even in development. Every production outage from a cert issue was preventable with automated monitoring.`
  },

  {
    id: 4,
    title: "DNS Resolution & Caching",
    tag: "THE INTERNET'S PHONE BOOK",
    color: "#D97706",
    tldr: `DNS (Domain Name System) translates human-readable hostnames (google.com) into IP addresses (142.250.80.46) that computers use to route packets. It's a globally distributed, hierarchical, heavily-cached system. DNS failures and cache issues are surprisingly common causes of production outages — understanding resolution order, TTLs, negative caching, and DNS propagation explains most of these.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"My DNS change isn't propagating — it's been 24 hours!"
"Why does my app resolve to the OLD IP after I updated DNS?"
"Health check says server is up but users can't connect"
"Local development works but production fails for specific hostnames"
"DNS lookup adding 200ms to every new connection"

Without understanding DNS:
  - You think "DNS propagation" is magic instead of TTL-controlled caching
  - You don't know that your app's in-process DNS cache might be 10 minutes behind
  - You miss negative caching as a cause of "DNS works now but app still fails"
  - You can't debug /etc/hosts vs /etc/resolv.conf vs DNS server response differences
  - You don't understand DNS over HTTPS (DoH) or why it matters for privacy
    `,
    analogy: `
THE LIBRARY CARD CATALOG ANALOGY:
----------------------------------
Imagine the internet as a giant library. DNS is the card catalog system.

THE HIERARCHY:
  Root Catalog (.)           → "I know which section to check for .com, .in, .org books"
  TLD Catalogs (.com, .in)   → "For google.com, ask the Google section"  
  Authoritative Catalogs     → "google.com lives at 142.250.80.46" ← THE ANSWER

THE LOOKUP:
  You want book "www.google.com":
  
  1. Check your POCKET (OS resolver cache / hosts file) — do I already know this?
  2. Ask the LOCAL LIBRARIAN (recursive resolver — usually your ISP or 8.8.8.8)
     "The local librarian will do the hard work FOR you and cache results"
  3. Librarian asks ROOT CATALOG: "Where's .com?"
     Root says: "Ask the .com catalog at 192.5.6.30"
  4. Librarian asks .COM CATALOG: "Where's google.com?"
     .com says: "Ask Google's catalog at 216.239.32.10"
  5. Librarian asks GOOGLE'S CATALOG: "What's the IP for www.google.com?"
     Google says: "142.250.80.46 — and remember this for 300 seconds (TTL)"
  6. Librarian tells YOU: "142.250.80.46" and CACHES it for 300 seconds

NEXT TIME (within 300 seconds): Librarian answers from cache instantly!
After 300 seconds: Librarian must ask again (TTL expired)

TTL MENTAL MODEL:
  Short TTL (60s): Changes propagate in 1 minute. But more DNS queries (more latency, more cost)
  Long TTL (86400s = 24h): Changes take up to 24h to propagate. But cached everywhere (fast).
  
  Smart strategy: BEFORE a change, lower TTL to 60s → make change → after confirmed, raise TTL back
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — DNS INTERNALS:
------------------------------------------

DNS RECORD TYPES:
  A record:      hostname → IPv4 address          (api.example.com → 1.2.3.4)
  AAAA record:   hostname → IPv6 address          (api.example.com → 2001:db8::1)
  CNAME:         hostname → another hostname      (www.example.com → example.com)
                 ⚠️ CNAME cannot coexist with other records for same name!
                 ⚠️ CNAME on apex domain (@) not allowed in classic DNS (use ALIAS/ANAME)
  MX record:     domain → mail server             (example.com → mail.example.com, priority 10)
  NS record:     domain → nameservers             (example.com → ns1.example.com)
  TXT record:    arbitrary text                   (SPF, DKIM, domain verification)
  SOA record:    Start of Authority               (zone info: primary NS, refresh timers)
  SRV record:    service discovery                (_http._tcp.example.com → port + host)
  PTR record:    IP → hostname (reverse DNS)      (4.3.2.1.in-addr.arpa → api.example.com)
  CAA record:    which CAs can issue certs        (prevents unauthorized cert issuance)
  ALIAS/ANAME:   apex domain to another hostname  (Cloudflare CNAME flattening)

DNS RESOLUTION ORDER (on Linux):
  /etc/nsswitch.conf: "hosts: files dns myhostname"
  1. /etc/hosts (local file — highest priority)
  2. OS DNS resolver cache (in-memory cache, not always present — depends on nscd/systemd-resolved)
  3. Configured DNS servers (/etc/resolv.conf: nameserver 8.8.8.8)
  
  Node.js DNS cache: Node.js does NOT cache DNS by default!
    Each dns.lookup() call queries OS (which may cache via nscd)
    For production: use dns-cache package or configure TTL caching in your HTTP agent

RECURSIVE vs AUTHORITATIVE RESOLVERS:
  Authoritative: holds the actual DNS records for a zone. Only answers for its zones.
    Examples: Route53 (AWS), Cloudflare, ns1.google.com
  
  Recursive (Resolver): performs full lookup on client's behalf, caches results
    Examples: 8.8.8.8 (Google), 1.1.1.1 (Cloudflare), your ISP's DNS, 
    systemd-resolved on Linux
    
  Query flow: Your app → Recursive resolver → Root NS → TLD NS → Authoritative NS

NEGATIVE CACHING (RFC 2308):
  When DNS query returns NXDOMAIN (name doesn't exist) or SERVFAIL,
  the NEGATIVE response is cached for the SOA's "minimum TTL"
  
  Example: App tries to connect to new-service.internal that doesn't exist yet
    → Gets NXDOMAIN → negative cache = 300 seconds
    → You add the DNS record 30 seconds later
    → App STILL gets NXDOMAIN for next 270 seconds!
    → Fix: Clear resolver cache (restart systemd-resolved) or wait

DNS OVER HTTPS (DoH) / DNS OVER TLS (DoT):
  Problem: Traditional DNS queries are plaintext UDP → your ISP/network sees every hostname you visit
  DoH: DNS queries inside HTTPS → encrypted → ISP can't see hostnames
    Example: https://dns.google/dns-query (RFC 8484)
    Used by: Chrome, Firefox by default
  DoT: DNS over TLS on port 853
  
  Privacy implication: Moves DNS visibility from ISP to the DoH provider (Google, Cloudflare, etc.)

DNS TTL STRATEGY:
  During normal operations: A records = 300-3600s, MX = 3600-86400s
  Before major changes:
    1. Lower TTL to 60s (wait for current TTL to expire so all caches update)
    2. Make the change
    3. Monitor for issues
    4. If issues: revert (change propagates in 60s since TTL is short!)
    5. If OK: raise TTL back to 300s+
  
  "DNS propagation" myth: there's no push — it's all TTL expiry + re-query

SPLIT-HORIZON DNS:
  Same hostname resolves differently based on WHERE you're querying from
  Internal DNS: api.example.com → 10.0.0.5 (private IP — internal LB)
  External DNS: api.example.com → 1.2.3.4 (public IP — public LB)
  
  Used in: VPNs, internal services, hybrid cloud setups

DNS LOAD BALANCING:
  Round Robin DNS: Return multiple A records, rotate order
    → Simple load balancing without a load balancer
    → Problem: Clients cache ONE answer — no real round-robin per request
  
  GeoDNS: Return nearest server's IP based on client's location
    → Cloudflare, Route53 Latency Routing
    → Reduces latency by routing to closest data center

DNS SECURITY — ATTACKS AND DEFENSES:
  DNS Cache Poisoning: Attacker injects fake DNS responses into resolver cache
    → All users on that resolver get fake IPs → phishing, MitM
    → Defense: DNSSEC (cryptographically sign DNS records)
  
  DNSSEC: Each DNS record signed with private key, verifiable with public key in DNS
    → Trust chain: Root zone signed → TLD zone signed → your zone signed
    → KSK (Key Signing Key) and ZSK (Zone Signing Key)
    → Added complexity, not universal adoption
  
  DNS Hijacking: ISP or attacker modifies DNS responses
    → Defense: DoH/DoT (encrypted transport), DNSSEC (signed records)
    `,
    code: `
// ===== DNS RESOLUTION & CACHING — CODE EXAMPLES =====

// EXAMPLE 1: DNS lookup in Node.js — the two different APIs
const dns = require('dns').promises;

// dns.lookup() — uses OS resolver (respects /etc/hosts, OS cache)
// Returns single address (what your app actually uses for connections)
async function osLookup(hostname) {
  const result = await dns.lookup(hostname);
  console.log('OS lookup:', result); // { address: '142.250.80.46', family: 4 }
  // This is what http.request() and fetch() use internally
}

// dns.resolve4() — bypasses OS, queries DNS directly  
// Returns all A records
async function directLookup(hostname) {
  const addresses = await dns.resolve4(hostname);
  console.log('Direct DNS:', addresses); // ['142.250.80.46', '142.250.67.46', ...]
}

// dns.resolve() — general purpose, specify record type
async function fullDnsInspect(hostname) {
  const [a, aaaa, mx, ns, txt] = await Promise.allSettled([
    dns.resolve4(hostname),                    // A records
    dns.resolve6(hostname),                    // AAAA records
    dns.resolveMx(hostname),                   // MX records  
    dns.resolveNs(hostname),                   // NS records
    dns.resolveTxt(hostname),                  // TXT records
  ]);
  
  return {
    ipv4: a.status === 'fulfilled' ? a.value : [],
    ipv6: aaaa.status === 'fulfilled' ? aaaa.value : [],
    mx: mx.status === 'fulfilled' ? mx.value : [],
    nameservers: ns.status === 'fulfilled' ? ns.value : [],
    txt: txt.status === 'fulfilled' ? txt.value : [],
  };
}

fullDnsInspect('google.com').then(console.log);

// EXAMPLE 2: DNS resolution timing — measuring DNS latency
async function measureDnsLatency(hostname, iterations = 5) {
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      await dns.resolve4(hostname);
      times.push(performance.now() - start);
    } catch (e) {
      times.push(-1); // Failed
    }
    // Small delay between queries
    await new Promise(r => setTimeout(r, 100));
  }
  
  const successful = times.filter(t => t > 0);
  console.log(\`DNS lookup times for \${hostname}:\`);
  console.log(\`  Min: \${Math.min(...successful).toFixed(2)}ms\`);
  console.log(\`  Max: \${Math.max(...successful).toFixed(2)}ms\`);
  console.log(\`  Avg: \${(successful.reduce((a,b) => a+b, 0) / successful.length).toFixed(2)}ms\`);
  // First call: 50-200ms (network query to resolver)
  // Subsequent calls: 1-5ms (cached by resolver, but Node.js re-queries OS each time!)
}

measureDnsLatency('api.example.com');

// EXAMPLE 3: Simple DNS cache in Node.js (since Node.js doesn't cache by default)
class DNSCache {
  constructor(defaultTTL = 30000) { // 30 second default TTL
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }
  
  async resolve(hostname) {
    const cached = this.cache.get(hostname);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.addresses; // Return cached value
    }
    
    // Cache miss or expired — do real DNS lookup
    const addresses = await dns.resolve4(hostname);
    this.cache.set(hostname, {
      addresses,
      expiresAt: Date.now() + this.defaultTTL,
      cachedAt: Date.now(),
    });
    
    return addresses;
  }
  
  invalidate(hostname) {
    this.cache.delete(hostname); // Force re-lookup
  }
  
  stats() {
    return {
      entries: this.cache.size,
      hostnames: [...this.cache.keys()],
    };
  }
}

const dnsCache = new DNSCache(60000); // 60s TTL
// Usage: const ip = (await dnsCache.resolve('api.example.com'))[0];

// EXAMPLE 4: DNS TTL extraction — see how long a record will be cached
const { Resolver } = require('dns').promises;

async function getDnsTTL(hostname, type = 'A') {
  // Use a specific resolver (bypass OS)
  const resolver = new Resolver();
  resolver.setServers(['8.8.8.8', '1.1.1.1']); // Google and Cloudflare resolvers
  
  // dns module doesn't expose TTL directly — use shell or dig for actual TTL
  // But we can use low-level resolve:
  try {
    // Hack: use node-dig or exec dig command:
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const { stdout } = await execAsync(\`dig +noall +answer \${hostname} \${type}\`);
    // Parse TTL from dig output: "api.example.com. 298 IN A 1.2.3.4"
    //                                                ^^^
    const match = stdout.match(/\\d+ IN \${type} /);
    if (match) {
      const ttl = parseInt(stdout.split('\\t')[1]);
      console.log(\`\${hostname} \${type} TTL: \${ttl}s (expires in \${ttl}s)\`);
      return ttl;
    }
  } catch (e) {
    console.error('dig not available:', e.message);
  }
}

// EXAMPLE 5: Health check with DNS validation — detect split-horizon DNS misconfig
async function healthCheckWithDNS(serviceName, expectedInternalIP) {
  const addresses = await dns.resolve4(serviceName);
  
  if (!addresses.includes(expectedInternalIP)) {
    console.error(\`DNS ALERT: \${serviceName} resolved to \${addresses} but expected \${expectedInternalIP}\`);
    console.error('Possible split-horizon DNS misconfiguration or DNS poisoning!');
    return false;
  }
  
  console.log(\`DNS OK: \${serviceName} → \${addresses[0]}\`);
  return true;
}

// EXAMPLE 6: Detecting DNS-based issues in a microservices setup
async function diagnoseServiceDNS(serviceHostname) {
  console.log(\`\\nDiagnosing DNS for: \${serviceHostname}\`);
  
  // 1. Check /etc/hosts override (OS lookup)
  const osResult = await dns.lookup(serviceHostname).catch(e => ({ error: e.code }));
  console.log('OS lookup (respects /etc/hosts):', osResult);
  
  // 2. Check direct DNS server
  const dnsResult = await dns.resolve4(serviceHostname).catch(e => ({ error: e.code }));
  console.log('Direct DNS resolve:', dnsResult);
  
  if (osResult.address !== (Array.isArray(dnsResult) ? dnsResult[0] : null)) {
    console.warn('⚠️  /etc/hosts is OVERRIDING DNS! OS sees different IP than DNS server.');
    console.warn('Check /etc/hosts for manual entries that may be stale.');
  }
  
  // 3. Reverse DNS (PTR record)
  const ip = Array.isArray(dnsResult) ? dnsResult[0] : osResult.address;
  if (ip) {
    const reverse = await dns.reverse(ip).catch(() => ['no PTR record']);
    console.log(\`Reverse DNS (\${ip}):\`, reverse);
  }
}

// EXAMPLE 7: DNS propagation checker — verify change has reached multiple resolvers
async function checkDnsPropagation(hostname, expectedIP) {
  const resolvers = {
    'Google (8.8.8.8)': '8.8.8.8',
    'Cloudflare (1.1.1.1)': '1.1.1.1',
    'OpenDNS (208.67.222.222)': '208.67.222.222',
    'Quad9 (9.9.9.9)': '9.9.9.9',
  };
  
  const results = {};
  
  for (const [name, resolverIP] of Object.entries(resolvers)) {
    const resolver = new Resolver();
    resolver.setServers([resolverIP]);
    
    try {
      const addresses = await resolver.resolve4(hostname);
      results[name] = {
        ip: addresses[0],
        propagated: addresses.includes(expectedIP),
      };
    } catch (e) {
      results[name] = { error: e.code };
    }
  }
  
  const propagatedCount = Object.values(results).filter(r => r.propagated).length;
  console.log(\`DNS propagation: \${propagatedCount}/\${Object.keys(resolvers).length} resolvers updated\`);
  console.table(results);
  return results;
}
    `,
    bugs: `
REAL PRODUCTION BUGS FROM DNS MISUNDERSTANDING:
-------------------------------------------------

BUG 1: Negative DNS caching causing 5-minute outage after DNS fix
  Scenario: Nikhil's service had wrong DNS record. Fixed it immediately. 
    Still broken for 5 minutes after fix. "DNS propagation is instant! Why still broken?"
  Root cause: NEGATIVE CACHING — when original broken record was queried, got SERVFAIL
    Negative cache TTL = 300 seconds (SOA minimum TTL)
    Even after fixing the record, resolvers served cached "does not exist" for 5 more minutes
  Fix:
    1. Short-term: Restart local resolver to flush cache: 
       systemctl restart systemd-resolved
    2. Mitigation: Set SOA minimum TTL to 60s to reduce negative cache time
    3. Process: Test DNS changes in staging, monitor with DNS propagation tools

BUG 2: Node.js app not picking up DNS changes — 30-minute stale resolution
  Scenario: Changed API server IP. Updated DNS. Old server decommissioned. Node app still hit old IP.
  Root cause: Node.js HTTP agent connection pool! Active TCP connections to old IP were REUSED.
    Even when DNS was updated, keep-alive pool held connections open to OLD IP for 30 minutes.
  Fix:
    a) Set keepAlive: false if DNS changes are expected (dev/staging)
    b) Set maxSocketAge on connections (custom agent logic)
    c) Set keepAliveTimeout shorter than expected DNS change frequency
    d) Graceful restart of app after major DNS/infrastructure changes
  Lesson: DNS resolution happens at CONNECTION TIME, not per-request, when connections are pooled

BUG 3: /etc/hosts override forgotten in Docker container
  Scenario: Works on dev machine, fails in staging. DNS resolves correctly but app connects to wrong host.
  Root cause: Developer added entry to /etc/hosts for local testing. 
    Docker container's /etc/hosts was modified by Compose extra_hosts setting copied from dev config
  Detection: cat /etc/hosts inside container showed stale override
  Fix: Remove extra_hosts from docker-compose.yml for staging. Audit hosts files in all environments.
  Lesson: Check /etc/hosts FIRST when "DNS seems fine but connection goes to wrong place"

BUG 4: DNS-based load balancing + connection pooling = skewed traffic
  Scenario: Round-robin DNS with 3 servers (equal weight). One server received 80% of traffic.
  Root cause: App server had large connection pool. Resolved DNS ONCE, connected to first IP.
    Pool kept ALL connections to that ONE IP. Other two servers got connections from clients 
    that happened to get different IPs in round-robin.
  Fix: Use a proper load balancer (L4 or L7) instead of DNS-based balancing for app-tier traffic.
    DNS round-robin works for: CDN edge nodes, nameserver distribution — not app servers.

BUG 5: Case-sensitive DNS comparison causing false health check failures
  Scenario: Health monitoring reported random failures for "API.example.com" 
    (uppercase hostname in config) while app itself worked fine
  Root cause: DNS is case-INsensitive (RFC 4343) but code was doing strict string comparison:
    if (resolvedHostname === 'API.example.com') // false because DNS returns lowercase
  Fix: Normalize hostnames to lowercase before comparison
    const canonical = hostname.toLowerCase();
  Bonus bug: URL constructor normalizes hostname, but string manipulation doesn't:
    new URL('https://API.example.com/path').hostname === 'api.example.com' // true (normalized)
    'https://API.example.com/path'.split('/')[2] === 'api.example.com' // false (not normalized!)
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE RESULT:
  For each DNS query scenario, what does the client receive and why?
  
  a) DNS record: api.example.com A 1.2.3.4 TTL=300
     Client queries at T=0 (gets 1.2.3.4, cached for 300s)
     Record changed to 5.6.7.8 at T=100
     Client queries again at T=200
     → What IP does client get? _______ Why? _______
  
  b) CNAME: www.example.com → example.com (TTL=3600)
     A record: example.com → 1.2.3.4 (TTL=60)
     Client queries www.example.com
     → How long is the full chain cached? _______
  
  c) The entry in /etc/hosts: "10.0.0.5 api.example.com"
     DNS A record for api.example.com: 1.2.3.4
     Node.js code: dns.lookup('api.example.com')
     → What IP is returned? _______ What if you use dns.resolve4() instead?

CHALLENGE 2 — DEBUG THE SCENARIO:
  Rohan's microservice "payment-service" (running in Kubernetes) 
  suddenly can't connect to "user-service.default.svc.cluster.local"
  It worked yesterday. User-service pods are running and healthy.
  
  Write a debugging runbook (step-by-step commands) to diagnose the issue.
  Consider these possible causes:
  - CoreDNS (Kubernetes DNS) is down or overloaded
  - Service definition has wrong selector (pods not backing the service)
  - Network policy blocking DNS port 53
  - NDots configuration causing wrong search domain resolution
  - user-service namespace deleted and recreated with different service IP

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a "DNS Health Monitor" with these features:
  
  1. Accept a list of production hostnames to monitor
  2. Every 60 seconds: query all hostnames from 3 different resolvers (8.8.8.8, 1.1.1.1, 9.9.9.9)
  3. Alert if:
     - Hostname resolves differently across resolvers (DNS inconsistency)
     - Hostname resolves to unexpected IP (DNS hijacking detection)
     - DNS query fails (NXDOMAIN or SERVFAIL)
     - Response time > 500ms (slow DNS resolver)
  4. Store history in memory and show:
     - Average DNS latency per hostname per resolver
     - Number of inconsistencies detected in last hour
     - Uptime percentage (successful resolves / total queries)
  5. Expose a /metrics endpoint (for Prometheus scraping)
    `,
    summary: `DNS is a distributed cache with TTL-controlled expiration, not an instant global database. Mastering DNS means understanding resolution order (hosts file → OS cache → recursive resolver), TTL strategy (lower before changes, raise after), negative caching (failed lookups are cached too), and the fact that connection pooling means your app might not re-resolve DNS after changes. Always monitor TTLs and propagation when doing DNS changes in production.`
  },

  {
    id: 5,
    title: "HTTP/1.1 vs HTTP/2 vs HTTP/3 — Multiplexing",
    tag: "FROM ONE LANE TO A SUPERHIGHWAY",
    color: "#7C3AED",
    tldr: `HTTP evolved from HTTP/1.1 (one request per TCP connection, head-of-line blocking) → HTTP/2 (multiple streams over one TCP connection, binary framing, header compression) → HTTP/3 (multiplexed streams over QUIC/UDP, no TCP head-of-line blocking, faster connection setup). Each version's design directly impacts page load performance, API latency, and how you architect server infrastructure.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"I enabled HTTP/2 but my API is slower — why?"
"What does 'head-of-line blocking' mean and why does it matter?"
"Should I use HTTP/3 for my API? Does Node.js support it?"
"Why does my CDN matter for HTTP/2 push?"
"Our page has 200 resources — how many TCP connections does that mean?"

HTTP/2 and HTTP/3 are often cargo-culted without understanding:
  - When HTTP/2 multiplexing HURTS (too many streams → prioritization complexity)
  - HTTP/3's QUIC eliminates TCP-level HOL blocking but adds UDP management overhead
  - Server push in HTTP/2 largely failed (Chrome removed support in 2022!)
  - HTTP/2 header compression (HPACK) can be a security issue (CRIME, BREACH attacks)
  - gRPC (HTTP/2 streaming) is very different from HTTP/1.1 REST
    `,
    analogy: `
THE HIGHWAY ANALOGY:
--------------------

HTTP/1.0 — SINGLE LANE ROAD WITH TOLL BOOTHS:
  Each request = open a new toll lane, pay toll (TCP handshake), drive through, lane closes.
  10 images on a page = 10 separate toll lanes opened and closed.
  Expensive and slow. Nobody uses HTTP/1.0 anymore.

HTTP/1.1 — HIGHWAY WITH KEEP-ALIVE + MULTIPLE LANES:
  Keep-alive = toll lane stays open after first car (reuse TCP connection)
  BUT: Lane is SINGLE-FILE. Car 2 must wait for car 1 to finish, even if car 1 is slow.
  That's HEAD-OF-LINE BLOCKING — one slow request blocks ALL requests behind it.
  
  Browsers workaround: Open 6 separate lanes (parallel TCP connections) per domain!
  But 6 × TCP handshake × TLS handshake = lots of overhead.
  Domain sharding trick: Split resources across multiple domains to get 6×6 = 36 connections
  (CSS from static1.example.com, images from static2.example.com)

HTTP/2 — MULTI-LANE HIGHWAY WITH MERGING:
  ONE lane (one TCP connection) but cars travel in parallel streams, INTERLEAVED.
  Request A and Request B travel simultaneously, mixed together as "frames" on one lane.
  No need for domain sharding — one connection handles everything!
  
  BUT: TCP head-of-line blocking still exists at the TCP level!
  If one TCP packet is lost → ALL streams stall waiting for retransmit.
  100 streams in one TCP connection → one packet drop stalls all 100.
  With HTTP/1.1's 6 connections → one packet drop stalls only 1 of 6 connections.
  
  In lossy networks (mobile, WiFi): HTTP/2 can be SLOWER than HTTP/1.1!

HTTP/3 — TELEPORTATION NETWORK (QUIC over UDP):
  Abandons TCP entirely. Uses QUIC protocol (built on UDP).
  Each stream is INDEPENDENT — one stream's packet loss doesn't stall others!
  PLUS: Combined TLS + transport handshake = 0-1 RTT instead of TCP(1RTT) + TLS(1RTT) = 2 RTT
  Works over UDP → can survive IP address changes (e.g. switching from WiFi to cellular mid-connection!)
  
  Connection Migration: Your phone switches from WiFi to 4G → same QUIC connection continues!
  (TCP would break because TCP connection = 4-tuple: src IP + src port + dst IP + dst port)
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — HTTP EVOLUTION:
-------------------------------------------

HTTP/1.1 (RFC 7230-7235, 1997):
  - Text-based protocol: human-readable headers
  - Keep-alive: Connection: keep-alive (default in 1.1, explicit in 1.0)
  - Pipelining: send multiple requests without waiting for responses
    → In theory solves HOL blocking, in practice broken by proxies/servers → rarely used
  - Head-of-Line Blocking: responses must arrive in ORDER of requests
    → Even if response 2 is ready, must wait for response 1
  - Performance hack: browsers open 6 connections per origin
  - Chunked Transfer Encoding: send response before knowing total size
  - Common headers: Host (mandatory in 1.1), Connection, Content-Type, Cache-Control

HTTP/2 (RFC 7540, 2015):
  Core concepts:
  
  1. BINARY FRAMING:
     Instead of text (GET /path HTTP/1.1\r\n...), HTTP/2 uses binary frames.
     Frame types: DATA, HEADERS, PRIORITY, RST_STREAM, SETTINGS, PUSH_PROMISE, PING, GOAWAY
     Each frame has: length(3B) + type(1B) + flags(1B) + stream_id(4B) + payload
  
  2. STREAMS, MESSAGES, FRAMES:
     Stream: bidirectional flow of frames, identified by integer stream ID
     Message: complete request or response (one or more frames)
     Frame: smallest unit of communication
     Multiple streams MULTIPLEXED over one TCP connection
     Client streams: odd IDs (1, 3, 5...), server push streams: even IDs
  
  3. HEADER COMPRESSION (HPACK):
     HTTP/1.1 sends headers in full on EVERY request (User-Agent, Cookie, Accept-Encoding...)
     These can be 500-2000 bytes per request!
     HPACK: maintains a "dynamic table" of seen headers
     Subsequent requests reference table entries instead of repeating headers
     "User-Agent: Mozilla/5.0..." → [index 42] (1-2 bytes instead of 50+ bytes)
     Security: CRIME attack exploited TLS compression + HPACK combo — don't use TLS compression!
  
  4. STREAM PRIORITIZATION:
     Client can tell server which streams are more important
     Dependencies tree: "Stream 5 depends on Stream 1 (JS before CSS loading)"
     Weights: "Streams 3,5,7 are equal but twice as important as stream 9"
     In practice: complex, hard to get right, often ignored — HTTP/3 drops this
  
  5. SERVER PUSH:
     Server can proactively push resources before client requests them
     PUSH_PROMISE frame: "I'm about to push /style.css and /app.js"
     Goal: eliminate RTT for known dependencies
     Reality: Cache invalidation problem (don't push what client already has)
     Chrome removed Server Push support in 2022 — it didn't help in practice
     Alternative: 103 Early Hints (works better, simpler, now widely supported)
  
  6. TCP HEAD-OF-LINE BLOCKING (HTTP/2's remaining problem):
     One TCP connection = one byte stream
     If packet 500 is lost: TCP waits for retransmit before delivering packets 501, 502...
     All HTTP/2 streams in that TCP connection wait
     On lossy networks: HTTP/2 multiplexing over single TCP can be WORSE than HTTP/1.1's 6 connections

HTTP/3 & QUIC (RFC 9000, RFC 9114, 2022):
  
  WHY UDP?
    TCP is implemented in OS kernel — changing TCP behavior is hard (kernel updates slow)
    QUIC runs in userspace — can evolve faster, be customized per application
    UDP has no reliability — QUIC implements reliability on top of UDP
  
  QUIC features:
  
  1. INDEPENDENT STREAMS:
     Each QUIC stream has its own flow control and retransmit
     Stream 3 packet loss → only Stream 3 waits for retransmit
     Streams 1, 2, 4, 5... continue unaffected
     This is REAL multiplexing — TCP's HOL blocking is GONE
  
  2. ZERO-RTT / 1-RTT HANDSHAKE:
     TLS 1.3 and QUIC handshake are COMBINED (not sequential)
     First connection: 1 RTT (vs TCP 1-RTT + TLS 1-RTT = 2 RTT with TLS 1.3, or more with 1.2)
     Resumption: 0-RTT possible with session resumption
     Saves 100-300ms on first connection
  
  3. CONNECTION MIGRATION:
     QUIC connection identified by CONNECTION ID (random bytes), NOT by 4-tuple
     If your IP changes (WiFi → cellular): same Connection ID → same QUIC connection!
     TCP: IP change = new 4-tuple = connection broken = reconnect required
     gRPC on HTTP/3: streaming RPC can survive network change without reconnecting
  
  4. LOSS DETECTION:
     QUIC uses Packet Numbers (monotonically increasing, never reused)
     TCP: ACK numbers make it ambiguous if ACK is for original or retransmit
     QUIC: Each packet has unique ID → precise loss detection → faster recovery
  
  QUIC HEADER ENCRYPTION:
     TCP: headers (sequence numbers, flags) are plaintext
     QUIC: packet headers are also encrypted → harder for middleboxes to interfere
     Problem: some firewalls/NATs don't understand QUIC → UDP 443 may be blocked
     Solution: HTTP/3 falls back to HTTP/2 or HTTP/1.1 if QUIC is blocked

HTTP/2 PERFORMANCE CHARACTERISTICS:
  Good for: many small resources (web pages with many assets), high-latency networks
  Neutral for: REST APIs with few parallel requests
  Potentially worse: mobile with high packet loss, many large file transfers
  Best practice: always use with TLS (all HTTP/2 implementations require it in practice)

GRPC AND HTTP/2:
  gRPC = Google's RPC framework built on HTTP/2
  Uses: binary serialization (Protocol Buffers), streaming RPCs, HTTP/2 multiplexing
  Stream types: Unary, Server Streaming, Client Streaming, Bidirectional Streaming
  Multiplexed HTTP/2: one gRPC connection handles many concurrent RPCs efficiently
    `,
    code: `
// ===== HTTP/1.1 vs HTTP/2 vs HTTP/3 — CODE EXAMPLES =====

// EXAMPLE 1: HTTP/1.1 with connection pooling (keep-alive)
const https = require('https');

// Default agent: 5 connections per host, keep-alive disabled
const agent11 = new https.Agent({
  keepAlive: true,           // Reuse TCP connections (HTTP/1.1 keep-alive)
  maxSockets: 6,             // Max 6 parallel connections per host (browser default)
  maxFreeSockets: 6,         // Keep 6 idle connections in pool
  keepAliveMsecs: 30000,     // TCP keepalive probe interval
  timeout: 10000,
});

// Each unique (host, port) pair gets its own pool of 6 connections
function http11Fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { agent: agent11 }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

// EXAMPLE 2: HTTP/2 with the http2 module (native Node.js)
const http2 = require('http2');

// HTTP/2: ONE connection, many concurrent streams
// This single connection handles all requests via multiplexing
const client2 = http2.connect('https://api.example.com', {
  // HTTP/2 settings:
  settings: {
    headerTableSize: 4096,      // HPACK table size
    enablePush: false,           // Disable server push (deprecated/removed in Chrome)
    initialWindowSize: 65535,   // Stream flow control window
    maxFrameSize: 16384,        // Max frame size
    maxConcurrentStreams: 100,  // How many concurrent streams server allows
  }
});

function http2Request(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    // Each request = new STREAM (not new TCP connection!)
    const req = client2.request({
      ':method': method,
      ':path': path,
      ':scheme': 'https',
      ':authority': 'api.example.com',
      'content-type': 'application/json',
    });
    
    req.setEncoding('utf8');
    let data = '';
    req.on('response', (headers) => {
      const status = headers[':status']; // HTTP/2 uses pseudo-headers
      console.log(\`HTTP/2 stream \${req.id}: status \${status}\`);
    });
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
    req.on('error', reject);
    req.end();
  });
}

// Parallel requests on ONE HTTP/2 connection (true multiplexing!)
async function parallelHttp2() {
  const start = Date.now();
  const results = await Promise.all([
    http2Request('/api/users/priya'),      // Stream 1
    http2Request('/api/products/123'),     // Stream 3
    http2Request('/api/orders?page=1'),    // Stream 5
    http2Request('/api/inventory/check'),  // Stream 7
  ]);
  // All 4 requests sent simultaneously over ONE TCP connection
  // HTTP/1.1: would need 4 separate connections OR wait for each sequentially
  console.log(\`4 parallel HTTP/2 requests in \${Date.now() - start}ms\`);
  client2.destroy();
}

// EXAMPLE 3: Measuring HTTP version in use
const https3 = require('https');

function checkHttpVersion(url) {
  return new Promise((resolve, reject) => {
    const req = https3.get(url, (res) => {
      // HTTP version used for this response:
      console.log('HTTP Version:', res.httpVersion); // '1.1' or '2.0'
      // HTTP/3 won't show here — Node.js doesn't have native HTTP/3 yet
      // Check for 'Alt-Svc' header which advertises HTTP/3 support:
      const altSvc = res.headers['alt-svc'];
      if (altSvc && altSvc.includes('h3')) {
        console.log('Server supports HTTP/3 (QUIC)!', altSvc);
        // Example: alt-svc: h3=":443"; ma=2592000
      }
      resolve({ version: res.httpVersion, altSvc });
      res.resume();
    });
    req.on('error', reject);
  });
}

checkHttpVersion('https://www.cloudflare.com');
// Cloudflare supports HTTP/3 — will show alt-svc: h3=":443"

// EXAMPLE 4: HTTP/2 server with proper settings
const http2Server = require('http2');
const fs2 = require('fs');

const server2 = http2Server.createSecureServer({
  key: fs2.readFileSync('server.key'),
  cert: fs2.readFileSync('server.crt'),
  
  settings: {
    maxConcurrentStreams: 100, // Limit concurrent streams per connection
    // Too high: server overwhelmed with too many parallel requests
    // Too low: client can't parallelize enough → defeats HTTP/2 purpose
    initialWindowSize: 1 << 20, // 1MB flow control window (good for large responses)
  },
  
  // Prevent HTTP/2 from being downgraded to HTTP/1.1
  allowHTTP1: true, // Allow HTTP/1.1 fallback for old clients
});

server2.on('stream', (stream, headers) => {
  // HTTP/2 uses "streams" not request/response
  const method = headers[':method'];
  const path = headers[':path'];
  
  console.log(\`Stream \${stream.id}: \${method} \${path}\`);
  
  if (path === '/') {
    // Respond with headers first, then data
    stream.respond({
      ':status': 200,
      'content-type': 'application/json',
      'cache-control': 'public, max-age=60',
    });
    stream.end(JSON.stringify({ 
      message: 'Hello from HTTP/2!',
      streamId: stream.id,
      protocol: 'h2', 
    }));
  } else {
    stream.respond({ ':status': 404 });
    stream.end('Not Found');
  }
});

// EXAMPLE 5: Demonstrating HOL blocking (HTTP/1.1 vs HTTP/2)
// HTTP/1.1 HOL blocking simulation:
async function demonstrateHOL() {
  const http = require('http');
  
  // Slow server that delays response 1 but not response 2
  const slowServer = http.createServer((req, res) => {
    if (req.url === '/slow') {
      setTimeout(() => {
        res.end('Slow response (took 2s)');
      }, 2000); // 2 second delay
    } else {
      res.end('Fast response (instant)'); // Instant
    }
  }).listen(9000);
  
  // HTTP/1.1 with pipelining: /slow blocks /fast
  // In practice: /slow and /fast are sent to DIFFERENT connections
  // (browser opens 6 connections specifically to AVOID HOL blocking!)
  
  console.log('With HTTP/1.1: connection 1 serves /slow (2s), connection 2 serves /fast (instant)');
  console.log('Total time: max(2s, <1ms) = ~2s (parallel connections help)');
  console.log('');
  console.log('With HTTP/2: streams 1 (/slow) and 3 (/fast) run concurrently on ONE connection');
  console.log('Total time: max(2s, <1ms) = ~2s (same, but with ONE connection!)');
  console.log('');
  console.log('HTTP/2 advantage: fewer connections, less overhead, better server efficiency');
  
  slowServer.close();
}

// EXAMPLE 6: Using fetch with HTTP/2 (in modern Node.js 18+)
// Node.js 18+ has native fetch with HTTP/2 support via undici
async function modernFetch() {
  // Node.js 18+ native fetch (uses undici internally, supports HTTP/2)
  const response = await fetch('https://api.example.com/data', {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGc...',
    },
  });
  
  // Check what protocol was used:
  // (Not directly exposed by fetch API — use undici's pool for details)
  const data = await response.json();
  console.log('Response status:', response.status);
  console.log('Protocol used:', response.url); // doesn't expose HTTP version
}

// EXAMPLE 7: HTTP/3 awareness — checking Alt-Svc and handling gracefully
async function http3Aware(url) {
  // Node.js doesn't have native HTTP/3 (as of Node 22)
  // Use: undici with QUIC support (experimental), or rely on CDN (Cloudflare/AWS CloudFront)
  
  // Check if server advertises HTTP/3:
  const res = await fetch(url);
  const altSvc = res.headers.get('alt-svc');
  
  if (altSvc?.includes('h3')) {
    const match = altSvc.match(/h3="([^"]+)"/);
    console.log(\`Server supports HTTP/3 at \${match?.[1] || 'same port'}\`);
    console.log('Use a CDN (Cloudflare, Fastly) or nginx with QUIC support to serve HTTP/3');
  }
  
  // In production: put Cloudflare or nginx (compiled with --with-http_v3_module) in front
  // Your Node.js backend: still speaks HTTP/1.1 or HTTP/2 to the CDN/reverse proxy
  // End users get HTTP/3 from CDN; CDN→origin is HTTP/2 or even HTTP/1.1
  // This is the most practical HTTP/3 deployment pattern
  
  return res;
}
    `,
    bugs: `
REAL PRODUCTION BUGS FROM HTTP VERSION MISUNDERSTANDING:
---------------------------------------------------------

BUG 1: HTTP/2 multiplexing causing server CPU spike with 1000-stream load test
  Scenario: Arjun load tested his Node.js HTTP/2 API. Performance was WORSE than HTTP/1.1.
    At 1000 concurrent "users" (1000 HTTP/2 streams), server CPU hit 100% and latency spiked.
  Root cause: Each "user" in load test was 1 HTTP/2 connection × 100 streams = 100,000 concurrent streams!
    HTTP/2 flow control, HPACK, and stream scheduling added massive CPU overhead.
    maxConcurrentStreams was set to default (unlimited) — server accepted all 100k streams.
  Fix:
    1. Set maxConcurrentStreams: 100 (or 200) — server rejects excess streams with REFUSED_STREAM
    2. Client retries refused streams — backpressure flows naturally
    3. Load testing HTTP/2 correctly: simulate realistic parallelism, not unlimited streams

BUG 2: Domain sharding HURTING performance after HTTP/2 migration
  Scenario: Frontend team migrated to HTTP/2. Added CDN with HTTP/2 support.
    But engineers had previously added domain sharding: static1.example.com, static2.example.com.
    After HTTP/2, performance got WORSE for some users.
  Root cause: With HTTP/1.1, domain sharding = more parallel connections = good.
    With HTTP/2, domain sharding = multiple TCP connections = DEFEATS multiplexing!
    HTTP/2 is designed for ONE connection per origin. Multiple origins = multiple connections.
    + Extra DNS lookups, extra TLS handshakes for each sharded domain.
  Fix: Remove domain sharding when HTTP/2 is in use.
    Consolidate all assets to single origin for HTTP/2 multiplexing to work optimally.

BUG 3: HTTP/2 server push causing cache stampedes  
  Scenario: Backend team implemented HTTP/2 server push for JS/CSS assets.
    Push actually INCREASED bandwidth and caused occasional 503 errors.
  Root cause: Server pushed /app.js on EVERY HTML request — even when client already had it cached!
    Clients were receiving pushed data, discarding it (already cached), wasting bandwidth.
    Multiple concurrent requests triggered multiple pushes of same file → server overloaded.
  Fix: Server push is fundamentally broken due to cache invalidation problem.
    Chrome removed push support in 2022. Use 103 Early Hints instead:
    HTTP/1.1 103 Early Hints response → browser preloads while HTML is being generated
    OR: Use <link rel="preload"> in HTML, Resource Hints

BUG 4: Forgetting HTTP/2 requires TLS (h2 vs h2c)
  Scenario: Kiran enabled HTTP/2 in nginx. Direct connections from backend services to nginx 
    were still HTTP/1.1. Expected HTTP/2 multiplexing savings not materializing.
  Root cause: h2 = HTTP/2 over TLS (required by all browsers and most HTTP clients)
    h2c = HTTP/2 cleartext (no TLS) — most clients don't support h2c
    nginx upstream (proxy_pass) defaults to HTTP/1.1. HTTP/2 to upstream requires explicit config:
    location / { 
      grpc_pass grpcs://backend; // For gRPC over HTTP/2
      // OR for regular HTTP/2:
      proxy_http_version 2.0; // Requires nginx compiled with --with-http_v2_module
    }
  Fix: Configure nginx to use HTTP/2 for upstream connections where supported.
    Check: curl -v --http2 https://backend-service:8080 to verify backend speaks HTTP/2.

BUG 5: HPACK dynamic table causing memory issues with many concurrent HTTP/2 connections
  Scenario: Payment processing service had memory leak under high HTTP/2 load.
    Memory grew monotonically and never released.
  Root cause: HPACK maintains a DYNAMIC TABLE per HTTP/2 connection. 
    Each unique header value seen is added to the table (up to headerTableSize, default 4096 bytes).
    With long-lived HTTP/2 connections from load balancers, each connection's HPACK state accumulates.
    Bug: Custom headers with high-cardinality values (request-id, trace-id = unique per request)
    were being added to HPACK table → table eviction → re-add → memory churn.
  Fix:
    1. Never compress high-cardinality headers (request IDs, timestamps):
       In HTTP/2: set "Never Indexed" flag on these headers (most clients/servers support this)
    2. Set smaller headerTableSize for high-connection scenarios
    3. Or use short-lived HTTP/2 connections (trade-off: more handshakes but less state)
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE PERFORMANCE:
  For each scenario, which HTTP version performs better and why?
  
  a) A web page loading 150 small assets (JS, CSS, images) over a low-latency fiber connection
      HTTP/1.1 (6 connections) vs HTTP/2 (1 connection, 150 streams)?
      Winner: _______ Reason: _______
  
  b) A mobile app making 3 API calls over a 3G connection with 5% packet loss rate
      HTTP/1.1 (3 connections) vs HTTP/2 (1 connection, 3 streams)?
      Winner: _______ Reason: _______ (hint: TCP HOL blocking + packet loss)
  
  c) A microservice making 1 API call at a time (no parallelism needed)
      HTTP/1.1 (keep-alive) vs HTTP/2?
      Winner: _______ Reason: _______
  
  d) A real-time dashboard fetching 20 metrics every second from a CDN near the user
      HTTP/2 vs HTTP/3?
      Winner: _______ Reason: _______

CHALLENGE 2 — ANALYZE THE ARCHITECTURE:
  You inherit this backend architecture:
  - Frontend: React SPA loading 200 assets (JS chunks, CSS, images)
  - CDN: CloudFront in front of an S3 bucket + API Gateway
  - API: Node.js on EC2, behind ALB (Application Load Balancer)
  - Domain sharding: static1.example.com, static2.example.com, static3.example.com
  - HTTP/2 is enabled on CloudFront
  
  Identify 3 performance anti-patterns given HTTP/2 is in use, and suggest fixes.
  Bonus: What would you change to enable HTTP/3 for end users?

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build an HTTP version performance benchmark tool:
  
  1. Accept a target URL
  2. Run 100 sequential requests using:
     - HTTP/1.1 (new connection each time, no keep-alive)
     - HTTP/1.1 (with keep-alive connection pool)
     - HTTP/2 (multiplexed over one connection)
  3. For each mode, measure and report:
     - Total time
     - Average request latency
     - P50, P95, P99 latency
     - Number of TCP connections opened
     - First Byte Time (TTFB) average
  4. Run 100 PARALLEL (Promise.all) requests using each mode
  5. Show a comparison table
  
  This tool should make the performance differences between HTTP versions concrete and measurable!
  Hint: Node.js http2.connect() for HTTP/2, https.Agent for HTTP/1.1
    `,
    summary: `HTTP/2 multiplexes many requests over ONE TCP connection using binary frames and streams, solving HTTP/1.1's need for multiple parallel connections. HTTP/3 takes this further by using QUIC (over UDP) to eliminate TCP-level head-of-line blocking and enable connection migration. The key insight: HTTP/2 is not always faster — it can hurt on lossy networks (TCP HOL blocking still exists) and requires removing HTTP/1.1-era workarounds like domain sharding. Match your HTTP version to your actual network conditions and parallelism needs.`
  }
];
