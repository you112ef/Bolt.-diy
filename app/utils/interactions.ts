export function playInteractionFeedback() {
  // Ensure the /sounds/ directory is in /public and the notify.mp3 file exists there.
  const audio = new Audio('/sounds/notify.mp3');
  audio.play().catch(error => {
    // Autoplay policies might prevent playback without user interaction.
    // Or the file might not be found.
    console.error("Error playing interaction sound:", error);
  });

  if ("vibrate" in navigator) {
    // Check if vibration is supported and enabled by the user/browser
    try {
      navigator.vibrate([100, 50, 100]); // Standard short buzz pattern
    } catch (error) {
      console.error("Error triggering vibration:", error);
    }
  }
}
