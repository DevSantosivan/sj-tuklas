namespace SjTuklas.Api.Dtos.Auth;

public class AuthResponseDto
{
    public AuthUserDto User { get; set; } = new();

    public int ExpiresIn { get; set; }
}