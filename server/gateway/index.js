const grpc = require("@grpc/grpc-js");
const CHAT_PROTO_FILE = "../proto/chat.proto";
const protoLoader = require("@grpc/proto-loader");

const packageDef = protoLoader.loadSync(CHAT_PROTO_FILE, {});
const grpcObj = grpc.loadPackageDefinition(packageDef);
const client = new grpcObj.ChatService("localhost:50051", grpc.credentials.createInsecure());

const call = client.Chat();

call.on("data", (msg) => {
    console.log("Received from server:", msg);
});

call.on("end", () => {
    console.log("Stream ended.");
});

call.on("error", (err) => {
    console.error("Stream error:", err);
});

setInterval(() => {
    call.write({ user: "NodeClient", message: `Hello from Node! at ${Date.now()}` });
}, 2000);
