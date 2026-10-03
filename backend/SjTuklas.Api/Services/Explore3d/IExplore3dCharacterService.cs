using SjTuklas.Api.DTOs.Explore3d;
using SjTuklas.Api.Models.Explore3d;

namespace SjTuklas.Api.Services.Explore3d;

public interface IExplore3dCharacterService
{
    Task<Explore3dCharacter?> GetByUserIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    );

    Task<Explore3dCharacter> CreateAsync(
        Guid userId,
        string username,
        CancellationToken cancellationToken = default
    );

    Task<Explore3dCharacter> GetOrCreateAsync(
        Guid userId,
        string username,
        CancellationToken cancellationToken = default
    );

    Task<Explore3dCharacter?> UpdateAsync(
        Guid userId,
        UpdateCharacterDto request,
        CancellationToken cancellationToken = default
    );
}