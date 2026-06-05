using Messy.API.Configuration;
using Messy.API.Data;
using Messy.API.Interfaces;
using Messy.API.Middleware;
using Messy.API.Services;
using Messy.API.Services.Chat;
using Messy.API.SignalR;
using Microsoft.EntityFrameworkCore;

var wwwrootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
if (!Directory.Exists(wwwrootPath))
{
    Directory.CreateDirectory(wwwrootPath);
}

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddDbContext<MessyDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddIdentityServices(builder.Configuration);
builder.Services.AddCorsServices(builder.Configuration);
builder.Services.AddPhotoServices(builder.Environment);

builder.Services.AddSignalR();
builder.Services.AddSingleton<PresenceTracker>();

builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<IChatService, ChatService>();
builder.Services.AddScoped<IUserService, UserService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseMiddleware<ExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapHub<ChatHub>("/hubs/chat");

app.UseStaticFiles();
app.UseRouting();
app.UseCors("AllowAngularApp");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();