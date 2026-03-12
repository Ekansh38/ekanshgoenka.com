---
title: "The Unix Socket IPC System"
project: "byte-space"
date: 2026-03-12
status: "complete"
weight: 2
---

<h2>Architecture Overview</h2>  
  
```
┌────────────┐
│            │
│  User CLI  │
│            │
└────▲──┬────┘
     │  │
     │  │
     │  │
 ┌───┼──▼───┐     ┌─────────────┐
 │          │────►│             │
 │  Engine  │     │ Visualizer  │
 │          │◄────│             │
 └───▲──┬───┘     └─────────────┘
     │  │
     │  │
     │  │
┌────┼──▼───┐
│           │
│ Admin CLI │
│           │
└───────────┘
```

<p>Byte-space needs multiple programs communicating with each other. The first versions of byte-space will run locally on your machine. However, I am designing the project architecture proactively for local and maybe even global multiplayer. How does that work? That is what this article explores. Hope you enjoy!</p>

<h2>The Pieces of Byte-space</h2>

<p>Byte-space has 4 main parts. The user CLI, admin CLI, engine and the visualizer. The user and admin CLI are practically the same program, just launched with a flag that changes the behaviour slightly. The engine is just the backend, it manages state of all machines, routes packets, and does basically everything important. The engine is split up into a few sections, including "computer" (computers, routers, servers, that kinda thing), the "shell", and a few packages for managing the actual network and scripting languages (haven't thought much about that yet...)</p>

<p>The user CLI is the main interface to actually navigate byte-space as a user. Telnet onto other machines, browse websites, do user activities. The admin CLI is for spawning new nodes onto the network and adjusting any admin related parts of the network (tick speed, config options, etc.). And the visualizer is a 2D graph visualizer of the nodes on the network and packets traveling between them. I will talk more about these separate parts in detail in the following articles but this one is more focused on the separation and communication of these processes.</p>

<h2>IPC...?</h2>

<p>IPC stands for inter-process communication and is used for making different programs or processes on your computer communicate. There are many ways to implement an IPC system but the method I chose has 2 main reasons. First I will dive into how the method I picked works, then why I picked it.</p>

<h2>Unix Sockets</h2>

<p>Enter Unix sockets, a super cool and simple method for IPC. It behaves very similarly to TCP sockets: one process listens on a socket, and other processes can connect to it and send messages. But it is built for local processes. Unix sockets use a file on the local filesystem (usually ending in <code>.sock</code>) as the connection point. One process creates and listens on this socket, and other processes connect to it just like they would connect to a network server. They then pass data through the operating system's socket buffers. The API is almost identical to TCP sockets, making it super easy to move between them. In practice, this means the engine acts as a server process, while the CLI tools and visualizer act as clients.</p>

<p>I first thought about using Go channels for communication but felt they where to clunky and not separate enough and wouldn't scale well with multiplayer. I later stumbled upon Unix sockets.</p>

<p>The reason Unix sockets stuck is firstly because I am super familiar with this server-client architecture from lots of web-dev and some TCP socket experience in the past and mainly because of the similarities they have with TCP sockets. This allows me to switch to TCP whenever I want in a super easy fashion. This could also later scale up easily to global multiplayer with a server sending packets in a similar format.</p>

<p>Another benefit with this modular architecture is that I can debug and work with each section separately, this makes debugging and organization much easier. For a semi-large project like this, proper segregation and organization of responsibility is almost essential for practical success.</p>

<h2>Nerdy Extras</h2>

<p>Here is how the IPC packets look in code:</p>

```go
type ClientIPCMessage struct {
	Program string
	RequestId int
	IP string
	Command string
}
```

<p>For the response:</p>

```go
type EngineIPCMessage struct {
	RequestId int
	Status int
	Result string `json:"result"`
}
```

<p>This is how it looks in JSON:</p>

```json
{
  "program": "client",
  "request_id": 31,
  "ip": "169.182.0.2",
  "command": "ls"
}

{
  "request_id": 31,
  "status": 0,
  "result": "home/\nlogs/\nconfig.json\nREADME.txt"
}
```

<p>As you can see each IPC packet is pretty simple and does what it needs to. It has a few pieces of data for the engine to work with and the response is plain and simple, usually the status is success or error with some context. The status is just if the operation was a success or fail. The client then parses and displays this response to the user in some fancy color indicating success or failure. In some cases when the status is a different value the message is for the client, this is usually when connecting to a "home" node or setting up the connection.</p>

<h2>Side Tangent</h2>

<p>The packets sent from the visualizer are still a WIP. I am thinking about 2 options, asking for some data or the engine sending info when something changes, either one works. I will decide and pick the best choice. I am leaning towards the engine informing when something changes rather than the visualizer just constantly asking, for performance benefits and the engine might just get annoyed.</p>



