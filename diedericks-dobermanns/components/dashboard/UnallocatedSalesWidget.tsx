import { SurfaceCard } from '@/components/admin/SurfaceCard';
import { Typography } from '@/components/ui/Typography';
import { useUnallocatedSalesCount } from '@/hooks/useUnallocatedSales';

export function UnallocatedSalesWidget() {
  const { count } = useUnallocatedSalesCount();

  return (
    <SurfaceCard
      title="Unallocated sales"
      href="/(admin)/dogs/unallocated"
      badge={count}
      badgeTone="gold"
    >
      <Typography variant="body">
        {count} sold {count === 1 ? 'dog' : 'dogs'} with no owner linked
      </Typography>
      <Typography variant="caption" className="mt-2 text-subtle">
        The buyer&apos;s name often sits inside the dog record. Link a client login from the
        list.
      </Typography>
    </SurfaceCard>
  );
}
