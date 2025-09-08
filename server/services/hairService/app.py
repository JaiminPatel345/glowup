import grpc
from concurrent import futures
import chat_pb2
import chat_pb2_grpc

class ChatService(chat_pb2_grpc.ChatServiceServicer):
    async def Chat(self, request_iterator, context):
        async for msg in request_iterator:
            print(f"Received from {msg.user}: {msg.message}")
            yield chat_pb2.ChatMessage(user="Server", message=f"Echo: {msg.message}")

async def serve():
    server = grpc.aio.server()
    chat_pb2_grpc.add_ChatServiceServicer_to_server(ChatService(), server)
    server.add_insecure_port("[::]:50051")
    await server.start()
    print("gRPC server started on :50051")
    await server.wait_for_termination()

if __name__ == "__main__":
    import asyncio
    asyncio.run(serve())
