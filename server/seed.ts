async function seed() {
  console.log('Seeding database...')
  
  // Players and games are now handled by the initializePlayers() 
  // function in index.ts which syncs hardcoded models and system engines.
  
  console.log('Seed script complete. (Note: System players are managed in index.ts)')
  process.exit(0)
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
