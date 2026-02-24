import clsx from "clsx";

interface TierBadgeProps {
    tier: string | null;
    isOverridden?: boolean;
}

export default function TierBadge({ tier, isOverridden }: TierBadgeProps) {
    if (!tier) {
        return (
            <span className="tier-badge bg-slate-100 text-slate-400 border border-slate-200">
                Unscored
            </span>
        );
    }

    const classes = {
        TIER_1: "tier-1",
        TIER_2: "tier-2",
        TIER_3: "tier-3",
    };

    const labels = {
        TIER_1: "Tier 1",
        TIER_2: "Tier 2",
        TIER_3: "Tier 3",
    };

    return (
        <span className={clsx("tier-badge", classes[tier as keyof typeof classes])}>
            {labels[tier as keyof typeof labels] || tier}
            {isOverridden && (
                <span className="ml-1 text-[10px] opacity-60">(overridden)</span>
            )}
        </span>
    );
}
