using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Helpdesk.Persistence;

/// <summary>Reports Healthy when the SQLite database answers a connection attempt.</summary>
public class DbHealthCheck(AppDbContext db) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken ct = default)
    {
        try
        {
            return await db.Database.CanConnectAsync(ct)
                ? HealthCheckResult.Healthy("sqlite reachable")
                : HealthCheckResult.Unhealthy("sqlite not reachable");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("sqlite error", ex);
        }
    }
}
