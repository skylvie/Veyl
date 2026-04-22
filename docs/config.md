# Configuration
Veyl uses a JSON config file. By default it looks for `veyl_config.json`, but you can override that with `-c`.

Example:
```jsonc
{
	"log_level": "info", // "none", "error", "info", "debug"
	"minify": true, // Minify output
	"obfuscate": {
		"strings": {
			"enabled": true, // Do string obfuscation
			"encode": true, // Encode string chunks before runtime decode
			"unicode_escape_sequence": false, // Emit visible \\uXXXX string literals
			"method": "array", // "array", "split"
			"split_length": 3 // Chunk length when using split string obfuscation
		},
		"numbers": {
			"enabled": true, // Do number obfuscation
			"method": "offset", // "offset", "equation"
			"offset": null, // Number offset or "randomized"/null, only for "offset"
			"operator": null // "+-", "*/", or "randomized"/null, only for "offset"
		},
		"booleans": {
			"enabled": true, // Do boolean obfuscation
			"method": "number", // "number", "depth"
			"number": null, // Number token or "randomized"/null, only for "number"
			"depth": null // Positive integer, "randomized", or null for default ![] / !![], only for "depth"
		}
	},
	"features": {
		"randomized_unique_identifiers": true, // Randomize identifiers (e.g. `_0x1a2b3c`)
		"unnecessary_depth": false, // Add "unnecessary" depth
		"dead_code_injection": false, // Insert unreachable decoy code blocks
		"control_flow_flattening": false, // Flatten eligible statement runs into a state machine
		"simplify": false, // Apply compacting rewrites such as merged declarations and conditional returns
		"functionify": false, // Run the final program body through `new Function(...)`
		"evalify": false, // Run the final program body through `eval(...)`
		"node_vm": false, // Run the final program body through `node:vm`
		"encryption": {
			"public_key": null, // Public key path used to encrypt wrapped payloads
			"private_key": null // Private key path embedded to decrypt wrapped payloads at runtime
		}
	}
}
```

Only one of `features.functionify`, `features.evalify`, or `features.node_vm` can be enabled at a time.
`features.encryption` can only be used when one of those execution-wrapper features is enabled, and both key paths must be set together or left `null`.
