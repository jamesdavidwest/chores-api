const { getChores, createChoreInstances } = require("../utils/dataAccess");

async function generateAllInstances() {
  try {
    console.log("Starting instance generation...");

    // Get all chores
    const chores = await getChores();
    console.log(`Found ${chores.length} chores`);

    // Generate instances for each chore
    for (const chore of chores) {
      console.log(`Generating instances for chore: ${chore.name}`);
      await createChoreInstances(
        chore.id,
        chore.start_date,
        chore.end_date,
        chore.frequency_id
      );
    }

    console.log("Instance generation complete!");
  } catch (error) {
    console.error("Error generating instances:", error);
  }
}

// Run the script
generateAllInstances();
