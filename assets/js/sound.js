const text1 = "Is this the real life? Is this just fantasy? Caught in a landside, No escape from reality Open your eyes, Look up to the skies and see, I'm just a poor boy, I need no sympathy, Because I'm easy come, easy go, Little high, little low, Any way the wind blows doesn't really matter to Me, to me";

const Speech1 = new SpeechSynthesisUtterance(text1);

Speech1.volume = 1;
Speech1.rate = -0.5;
Speech1.pitch = 10;

window.speechSynthesis.speak(Speech1);