using Messy.API.Interfaces;
using Messy.API.Services;

namespace Messy.API.Configuration;

public static class PhotoServiceConfiguration
{
    public static IServiceCollection AddPhotoServices(this IServiceCollection services, IWebHostEnvironment env)
    {
        if (env.IsDevelopment())
        {
            services.AddScoped<IPhotoService, LocalPhotoService>();
        }
        else
        {
            services.AddScoped<IPhotoService, CloudPhotoService>();
        }

        return services;
    }
}