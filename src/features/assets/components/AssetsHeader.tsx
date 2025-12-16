import { memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/page-title";

interface AssetsHeaderProps {
  canCreateAsset: boolean;
}

export const AssetsHeader = memo(function AssetsHeader({ canCreateAsset }: AssetsHeaderProps) {
  const navigate = useNavigate();

  const handleCreate = useCallback(() => {
    navigate('/it-assets/assets/new');
  }, [navigate]);

  return (
    <div className="flex items-center justify-between">
      <PageTitle
        title="Assets"
        icon={Package}
        description="Manage all IT assets in your inventory"
      />
      {canCreateAsset && (
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Asset
        </Button>
      )}
    </div>
  );
});

