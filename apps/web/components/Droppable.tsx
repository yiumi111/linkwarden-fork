import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import { DroppableData } from "@linkwarden/types/global";

const Droppable = ({
  children,
  id,
  data,
  className,
}: {
  children: React.ReactNode;
  id: string;
  data?: DroppableData;
  className?: string;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        isOver &&
          "bg-primary/10 outline-2 outline-dashed outline-primary rounded-lg",
        className
      )}
      data-over={isOver ? "true" : undefined}
      style={{
        position: "relative",
        zIndex: isOver ? 1 : "auto",
      }}
    >
      {children}
    </div>
  );
};

export default Droppable;
