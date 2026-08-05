import { Users } from "lucide-react";

const SidebarSkeleton = () => {
  const skeletonContacts = Array(8).fill(null);

  return (
    <aside className="h-full w-full md:w-20 lg:w-80 border-r border-base-300 flex flex-col bg-base-100 transition-all duration-200">
      {/* Header */}
      <div className="p-4 border-b border-base-300 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <span className="font-semibold block md:hidden lg:block">Chats</span>
        </div>

        {/* Search skeleton */}
        <div className="skeleton h-8 w-full rounded-xl block md:hidden lg:block" />

        {/* Filter tab skeletons */}
        <div className="flex gap-1 block md:hidden lg:flex">
          {Array(5).fill(null).map((_, i) => (
            <div key={i} className="skeleton h-6 w-14 rounded-full" />
          ))}
        </div>
      </div>

      {/* Contact Skeletons */}
      <div className="overflow-y-auto w-full py-2">
        {skeletonContacts.map((_, idx) => (
          <div key={idx} className="w-full p-3 flex items-center gap-3">
            {/* Avatar skeleton */}
            <div className="skeleton size-12 rounded-full flex-shrink-0 mx-0 md:mx-auto lg:mx-0" />

            {/* User info skeleton */}
            <div className="flex-1 space-y-2 block md:hidden lg:block">
              <div className="flex justify-between">
                <div className="skeleton h-4 w-28" />
                <div className="skeleton h-3 w-8" />
              </div>
              <div className="skeleton h-3 w-36" />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default SidebarSkeleton;
