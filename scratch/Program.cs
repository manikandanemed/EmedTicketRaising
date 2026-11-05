using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using TeamTrack.Data;

var connStr = "Server=database-1-instance-1.cf1efoaxqf1m.us-east-2.rds.amazonaws.com;Port=5432;User ID=postgres;Password=rhwJVtgh7bpTQxGN7NkzYltGtZd2BrhCFjntAf;Database=TicketingDB;Pooling=true;Timeout=20;CommandTimeout=20";

var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
optionsBuilder.UseNpgsql(connStr);

using var db = new AppDbContext(optionsBuilder.Options);

var allProducts = await db.Products.ToListAsync();
Console.WriteLine($"Total Products: {allProducts.Count}");
foreach (var p in allProducts)
{
    Console.WriteLine($"Product: {p.Id} - {p.Name} | ProjectId: {p.ProjectId}");
}
