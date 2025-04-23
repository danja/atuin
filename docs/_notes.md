## Atuin has two views of an RDF model - Turtle text in codemirror and a graph visualizer. I'd like to refactor it to use evb as a lib to facilitate the communication between the two views so that later it can be extended more easily

Please create a concise but comprehensive document artifact to aid in future plans. It will list the features then describe the architecture of the code. Points where refactoring may be desirable should be highlighted. Finally give a list of potential enhancements.

There are still some unshortened uris

A little work is needed around the GraphVisualizer. It's currently inconsistent and rather ugly.
We will do it in small steps, starting with : property labels and literals should be in rounded rectangles

- colors in the visualizer should echo those in the syntax highlighting, except
- nodes corresponding to rdf classes, properties should have orange, yellow backgrounds
- properties and objects in the visualizer should be shown in their prefixed form

see attached image. Reread the above. Rounded rectangles, prefixed form. Double-check before giving me the artifacts, the recent attempts have been making things worse.

---

Please modify so that the namespace URI strings, eg. '<http://example.org/>' are different than other strings and colored FFA500.
Take care to use a valid token tag in the Lezer highlighting system.

---

Now please change the prefixes in the namespace declarations to a light green. So with :

```
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix ex: <http://example.org/> .
```

rdf: rdfs: owl: ex: will be green.

---

I'd like a small addition to Turtle syntax highlighting, namespace prefixes should be dark green.
So in the following :

```
@prefix ex: <http://example.org/> .
ex:Person a rdfs:Class ;
```

The two instances of 'ex:' and the one instance of 'rdfs:' should be a different colour.
The tokens might already be defined but not yet used.

---

Please modify `src/js/core/Parser.js` and other RDF functionality to use @rdfjs/parser-n3, together with @rdfjs/data-model, @rdfjs/namespace and rdf-ext as neccesary.

"@rdfjs/data-model": "^2.0.1",
"@rdfjs/namespace": "^2.0.0",
"": "^2.0.1",
"loglevel": "^1.8.1",
"marked": "^5.0.0",
"rdf-ext": "^2.2.0"
