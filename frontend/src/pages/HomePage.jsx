import { useChatStore } from "../store/useChatStore";
import { Link, useLocation } from "react-router-dom";
import { MessageSquare, Users, Phone, User } from "lucide-react";
import { useVisualViewport } from "../hooks/useVisualViewport";

import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const { selectedUser } = useChatStore();
  const viewportHeight = useVisualViewport();
  const location = useLocation();

  const mobileHeightStyle = viewportHeight ? { height: `${viewportHeight}px` } : { height: "100dvh" };

  return (
    <div className="h-screen h-[100dvh] bg-base-200 flex flex-col overflow-hidden w-full relative">
      {/* Main chat area wrapper */}
      <div className="flex-1 flex items-center justify-center pt-16 sm:pt-16 px-0 sm:px-4 sm:pb-4 overflow-hidden w-full h-full">
        <div className="bg-base-100 sm:rounded-xl shadow-xl w-full max-w-6xl h-full sm:h-[calc(100dvh-5rem)] overflow-hidden flex relative">
          
          {/* Sidebar panel (Chat/Contact list) */}
          <div className={`h-full w-full md:w-auto flex-shrink-0 ${selectedUser ? "hidden md:flex" : "flex flex-col w-full pb-16 sm:pb-0"}`}>
            <Sidebar />
          </div>

          {/* Chat conversation panel */}
          <div
            style={selectedUser ? mobileHeightStyle : undefined}
            className={`h-full flex-1 min-w-0 ${!selectedUser ? "hidden md:flex" : "flex flex-col w-full fixed inset-0 z-50 sm:relative sm:inset-auto sm:z-auto sm:h-full bg-base-100 overflow-hidden"}`}
          >
            {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
          </div>
        </div>
      </div>

      {/* Mobile bottom navigation bar - ONLY visible when no active chat on mobile */}
      {!selectedUser && (
        <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-base-100 border-t border-base-300 z-40 flex items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg flex-shrink-0">
          <Link
            to="/"
            className={`flex-1 flex flex-col items-center justify-center py-1 gap-1 transition-colors ${
              location.pathname === "/" ? "text-primary font-semibold" : "text-base-content/60 hover:text-base-content"
            }`}
          >
            <MessageSquare className="size-5" />
            <span className="text-xs font-medium leading-none">Chats</span>
          </Link>
          <button
            className="flex-1 flex flex-col items-center justify-center py-1 gap-1 text-base-content/60 hover:text-base-content transition-colors"
          >
            <Users className="size-5" />
            <span className="text-xs font-medium leading-none">Contacts</span>
          </button>
          <button
            className="flex-1 flex flex-col items-center justify-center py-1 gap-1 text-base-content/60 hover:text-base-content transition-colors"
          >
            <Phone className="size-5" />
            <span className="text-xs font-medium leading-none">Calls</span>
          </button>
          <Link
            to="/profile"
            className={`flex-1 flex flex-col items-center justify-center py-1 gap-1 transition-colors ${
              location.pathname === "/profile" ? "text-primary font-semibold" : "text-base-content/60 hover:text-base-content"
            }`}
          >
            <User className="size-5" />
            <span className="text-xs font-medium leading-none">Profile</span>
          </Link>
        </nav>
      )}
    </div>
  );
};

export default HomePage;
