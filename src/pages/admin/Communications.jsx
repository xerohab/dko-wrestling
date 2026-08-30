import BreakingNewsPush from "@/components/admin/BreakingNewsPush";
import AdminEmailComposer from "@/components/admin/AdminEmailComposer";

export default function Communications() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-oswald font-bold text-white text-3xl uppercase">Communications</h1>
        <p className="text-muted-foreground font-inter text-sm mt-1">Send breaking news push notifications and email users.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BreakingNewsPush />
        <AdminEmailComposer />
      </div>
    </div>
  );
}