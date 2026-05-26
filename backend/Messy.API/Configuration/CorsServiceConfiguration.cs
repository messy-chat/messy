namespace Messy.API.Configuration;

public static class CorsServiceConfiguration
{
    public static IServiceCollection AddCorsServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddCors(options =>
        {
            var frontendUrl = configuration["FrontendUrl"];
            
            options.AddPolicy("AllowAngularApp", policy =>
            {
                policy.WithOrigins(frontendUrl!)
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials();
            });
        });

        return services;
    }
}