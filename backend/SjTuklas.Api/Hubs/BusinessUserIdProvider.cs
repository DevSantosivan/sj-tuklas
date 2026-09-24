using System.Security.Claims;

using Microsoft.AspNetCore.SignalR;

namespace SjTuklas.Api.Hubs;

public class BusinessUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
    {
        return connection.User?
            .FindFirstValue("sub");
    }
}