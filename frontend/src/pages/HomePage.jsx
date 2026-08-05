import { useChatStore } from "../store/useChatStore";

import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const { selectedUser } = useChatStore();

  return (
    <div className="h-screen bg-base-200">
      <div className="flex items-center justify-center pt-16 sm:pt-20 px-0 sm:px-4">
        <div className="bg-base-100 sm:rounded-lg shadow-cl w-full max-w-6xl h-[calc(100dvh-4rem)] sm:h-[calc(100vh-8rem)]">
          <div className="flex h-full sm:rounded-lg overflow-hidden">
            <div className={`h-full w-full md:w-auto ${selectedUser ? "hidden md:flex" : "flex"}`}>
              <Sidebar />
            </div>

            <div className={`h-full w-full md:flex-1 ${!selectedUser ? "hidden md:flex" : "flex"}`}>
              {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default HomePage;
