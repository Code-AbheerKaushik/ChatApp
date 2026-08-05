import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Link, useNavigate } from "react-router-dom";
import { MessageSquare, Users, Phone, User } from "lucide-react";

import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const { selectedUser } = useChatStore();

  return (
    <div className="h-screen bg-base-200 flex flex-col">
      {/* Main chat area: fills from navbar height to bottom nav (on mobile) */}
      <div className="flex-1 flex items-center justify-center pt-16 sm:pt-16 px-0 sm:px-4 pb-14 sm:pb-0 overflow-hidden">
        <div className="bg-base-100 sm:rounded-xl shadow-xl w-full max-w-6xl h-full sm:h-[calc(100vh-6rem)] overflow-hidden flex">
          {/* Sidebar panel */}
          <div className={`h-full w-full md:w-auto flex-shrink-0 ${selectedUser ? "hidden md:flex" : "flex"}`}>
            <Sidebar />
          </div>

          {/* Chat panel */}
          <div className={`h-full flex-1 min-w-0 ${!selectedUser ? "hidden md:flex" : "flex"}`}>
            {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
          </div>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-base-100 border-t border-base-300 z-40 flex">
        <Link
          to="/"
          className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-primary"
        >
          <MessageSquare className="size-5" />
          <span className="text-[10px] font-medium">Chats</span>
        </Link>
        <button className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-base-content/50">
          <Users className="size-5" />
          <span className="text-[10px] font-medium">Contacts</span>
        </button>
        <button className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-base-content/50">
          <Phone className="size-5" />
          <span className="text-[10px] font-medium">Calls</span>
        </button>
        <Link
          to="/profile"
          className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-base-content/50"
        >
          <User className="size-5" />
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </nav>
    </div>
  );
};
export default HomePage;
