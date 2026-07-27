//! IDEOCODE Contextual Humor (P4)
//!
//! Funny comments based on code patterns, errors, and usage.

use rand::seq::IndexedRandom;

/// Get a funny comment based on code context.
pub fn get_contextual_humor(context: &HumorContext) -> &'static str {
    let comments = match context {
        HumorContext::LongVariableName => &[
            "That variable name is longer than my attention span.",
            "Are you naming variables or writing a novel?",
            "I've seen shorter names in legal documents.",
        ],
        HumorContext::DeeplyNested => &[
            "This nesting goes deeper than Inception.",
            "I need a PhD to read this code.",
            "Is this a pyramid scheme for brackets?",
        ],
        HumorContext::TodoComments => &[
            "I see you've been procrastinating.",
            "TODO: Finish all the TODOs.",
            "The road to hell is paved with TODO comments.",
        ],
        HumorContext::MagicNumber => &[
            "Is this a phone number or a magic number?",
            "Found a wild number appearing!",
            "42 is the only magic number I accept.",
        ],
        HumorContext::LongFunction => &[
            "This function is longer than my grocery list.",
            "You might want to break this up.",
            "Functions shouldn't need a table of contents.",
        ],
        HumorContext::EmptyCatch => &[
            "Swallowed errors? That's a bad diet.",
            "Silent failures are the worst kind of failures.",
            "Nothing to see here... literally.",
        ],
        HumorContext::CommentedCode => &[
            "To comment or not to comment...",
            "This code is playing hide and seek.",
            "Is this art or code? Hard to tell.",
        ],
        HumorContext::CopyPaste => &[
            "Ctrl+C, Ctrl+V: The programmer's best friends.",
            "This code looks suspiciously familiar.",
            "DRY stands for Don't Repeat Yourself.",
        ],
    };

    comments.choose(&mut rand::rng()).unwrap_or(&"")
}

#[derive(Debug)]
pub enum HumorContext {
    LongVariableName,
    DeeplyNested,
    TodoComments,
    MagicNumber,
    LongFunction,
    EmptyCatch,
    CommentedCode,
    CopyPaste,
}

/// Get a startup greeting based on time of day.
pub fn time_greeting() -> &'static str {
    use std::time::{SystemTime, UNIX_EPOCH};

    let Ok(now) = SystemTime::now().duration_since(UNIX_EPOCH) else {
        return "Hello, time traveler!";
    };

    let hour = (now.as_secs() / 3600) % 24;
    match hour {
        0..=5 => "Burning the midnight oil? I respect the hustle. 🌙",
        6..=11 => "Good morning! Ready to ship some code? ☀️",
        12..=17 => "Good afternoon! Let's get productive. 🚀",
        18..=21 => "Evening session! Time to debug some dreams. 🌆",
        _ => "Late night coding? Don't forget to hydrate. 💧",
    }
}

/// Random fun facts about programming.
pub fn fact() -> &'static str {
    let facts = &[
        "The first computer bug was an actual moth.",
        "Python is named after Monty Python, not the snake.",
        "The first computer programmer was Ada Lovelace.",
        "Java was originally called Oak.",
        "The first 1GB hard drive weighed 550 pounds.",
        "The term 'debugging' was coined by Grace Hopper.",
        "The first computer mouse was made of wood.",
        "The average programmer writes 50 lines of production code per day.",
    ];

    facts.choose(&mut rand::rng()).unwrap_or(&"")
}

/// Easter egg responses.
pub fn easter_egg_response(egg: &str) -> &'static str {
    match egg {
        "/party" => "🎉 Party mode activated! Let's celebrate some code!",
        "/magic" => "✨ Abracadabra... your code is now magical!",
        "/retro" => "🕹️ Loading retro mode... beep boop beep...",
        "/matrix" => "🔴 Taking the red pill... follow the white rabbit.",
        "/sparkle" => "✨✨✨ Everything is sparkly now! ✨✨✨",
        "/neon" => "💜 Neon lights activated! Welcome to the future.",
        "/cyber" => "🌆 Cyberpunk 2077 called. They want their aesthetic back.",
        _ => "Unknown easter egg! Try /party, /magic, /retro, /matrix, /sparkle, /neon, /cyber",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn time_greeting_works() {
        let greeting = time_greeting();
        assert!(!greeting.is_empty());
    }

    #[test]
    fn fun_fact_works() {
        let fact = fact();
        assert!(!fact.is_empty());
    }
}
