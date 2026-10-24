/* Build reproducibility: rebuilds the site from source/ and compares it with the files committed at the repository root
   (index.html, sw.js, manifest.webmanifest), ignoring only the build id. Exit 1 when the committed build is stale.
   The minified output depends on the terser/lightningcss versions: a mismatch can also mean different tool versions. */
