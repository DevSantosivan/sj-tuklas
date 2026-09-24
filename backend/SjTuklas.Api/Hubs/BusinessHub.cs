using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace SjTuklas.Api.Hubs;

[Authorize]
public class BusinessHub : Hub
{
}