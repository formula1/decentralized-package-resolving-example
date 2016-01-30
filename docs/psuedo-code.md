
##### Psuedo Code and Flow

**Install - SEMVER**
- Client - `npm install package_name`
- Client - checks if it matches available protocols
- Client - It does not
- Client - transforms `package_name` to a **SemVer-H**
- Client - sends **Semver-H** to trusted **Registries**
- Registries[] - Accepts **Semver-H** request from **Client**
- Registries[] - Resolves **Semver-H** to **Dist-H**
- Registries[] - Sends to **Client** [**Dist-H**, connected **Distributors**, **Dist-T-Package-M**];
- Client - accepts responses from **Registries**
- Client - reduces responses into

```
{
  `${Dist-T-Package-M}`: {
    `${Dist-P}`: {
      distribution-handles: [ {
        handle: `${Dist-H}`,
        distributors: [`${Distributors}`],
        registries: [`${Registries with this Dist-H}`],
        trust: Math.max(${Registries['whos response had this Dist-H'].priority})
      } ],
      trust: Math.max(${Registries['whos response had this Dist-P'].priority})
    }
    trust: Math.max(${Registries['whos response had this Dist-T-Package-M'].priority})
  }
}
```

- Client - if a **Dist-T-Package-M** is not available, it is ignored
- Client - if more than on **Dist-T-Package-M** exists, go with most trusted
- Client - if more than one **Dist-H** exists for a given **Dist-T-Package-M**, go with most trusted (Also should question heavilly the reliability of the other Registies)
- Client - Use a **Dist-P** which can send **Dist-H** to **Distributors**
- Distributors[] - Accepts **Dist-H** request from **Client**
- Distributors[] - Resolves **Dist-H** to **Dist-T**
- Distributors[] - Sends **Dist-T** to Client
- Client - Accepts **Dist-T** from **Distributors**
- Client - Transforms **Dist-T** with **Dist-T-Package-M** into a **Package**
- Client - Moves or copies **Package** to correct location
- Client - Reads **Package** dependencies
- Client - for each dependency do INSTALL FROM PACKAGE
- Client - add the dependency to its `package.json` as

```
{
  name: "a_package",
  version: ${version},
  install: {
    type: 'registry',
    registries: ["${registry.url}"],
    repository: {
      url: "${repository.url}",
      protocol: "${repository.protocol}",
      transform: {
        type: "${repository_transform.type}",
        args: [${repository_transform.args}]
    },
    distrubtor: {
      urls: ["${distributor.url}"],
      protocol: "${distributor.protocol}",
      handle: ${distributor_transform.handle},
      transform: {
        type: "${distributor_transform.type}",
        args: [${distributor_transform.args}]
      }
    }
  }
}
```

- FIN

**Install-from-package**
- Client - `npm install`
- Client - for each dependency in `package.json`
  - Client - if **Dist-H**, **Dist-P** and **Dist-T-Pack-M** is available
    - Client -Use a **Dist-P** which can send **Dist-H** to **Distributors**
    - Distributors[] - Accepts **Dist-H** request from **Client**
    - Distributors[] - Resolves **Dist-H** to **Dist-T**
    - Distributors[] - Sends **Dist-T** to Client
    - Client - Accepts **Dist-T** from **Distributors**
    - Client - Transforms **Dist-T** with **Dist-T-Package-M** into a **Package**
    - returns **Package**
  - Client - if **Registry** Is available and **Distributors** are not available to **Client**
    - Client - do INSTALL SEMVER (to check if it changed location)
  - Client - if **Repository**, **Repo-P**, **Repo-H** and **Repo-T-Pack-M** is available and above failed
    - Client - requests **Repository** over **Repo-P** with **Repo-H**
    - Repository - accepts request from **Client**
    - Repository - resolves **Repo-H** to **Repo-T**
    - Repository - responds to **Client** with **Repo-T**
    - Client - recieves **Repo-T** from **Repository**
    - Client - transforms **Repo-T** through **Repo-T-Pack-M** into **Package**
    - return **Package**
- Client - Moves or copies **Package** to correct location
- Client - Reads **Package** dependencies
- Client - for each dependency do INSTALL FROM PACKAGE


**Publish - Ideal**
- Client - `npm publish`
- Client - sends `to_send` to all trusted **Registries**
- Registries[] - Accepts request from **Client**
- Registries[] - Authenticates **Client**
- Registries[] - requests **Repository** over **Repo-P** with **Repo-H**
- Repository - accepts request from **Registry**
- Repository - resolves **Repo-H** to **Repo-T**
- Repository - sends **Repo-T** to **Registry**
- Registries[] - recieves **Repo-T** from **Repository**
- Registries[] - transforms **Repo-T** through **Repo-T-Pack-M** into **Package**
- Registries[] - Ensure **Client** `package.json` === **Repository** `package.json`
- Registries[] - transforms **Package** through **Pack-SemVer-H-M** into **SemVer-H**
- Registries[] - transforms **Package** through **Pack-Dist-T-M**  into **Dist-T**
- Registries[] - transforms **Dist-T** through **Dist-T-Dist-H-M** into **Dist-H**
- Registries[] - Indexes Semver into {package: `package.json`, handle: **Dist-H** }
- Registries[] - requests all **Distributors** to request **Dist-H**
- Distributors[] - accepts request from **Registry**
- Distributors[] - requests **Dist-H** from All other **Distributors** and **Registries**
- Distributors[] - Seeds **Dist-H** when finished
- Distributors[] - responds to **Registry**
- Registries[] - Accepts response from their distributors
- Registries[] - Remove **Repo-T**, **Dist-T** and **Package** if they choose to
- Registries[] - Respond to **Client**
- FIN

### Entrence Criteria
- champion - This and specifications should probably be discussed here. Who(m?) is going to do the work? I feel as though npm would be the most interested in this, I think someone in the last thread mentioned that. [ied](https://github.com/alexanderGugel/ied) should probably be contacted in the conversation.
- general shape - Packages aren't forced to all be hosted on one server while sacrificing naming. They can be resolved from one server, but are not forced to be. Really this is a naming issue since at this current point in time consumers can set a repository as the package. They can also download and link if they really need to.
- use case
  - I am a company running 10 projects at one time
    - after our testing process we upload to npm
    - npm goes down convieniently as we just release a critical bug patch that could save peoples kittens
    - no one can download the patch because npm is kaput
    - we go on twitter to yell at the world to download the repository from our repo
    - no one listens because few people follow us.
    - this could have been avoided by multiple trusted hosts all resolving to the companies name
  - I am a developer that just got started off in node
    - I'm looking for open gl plugins, oh! look theres [headless-gl](https://github.com/stackgl/headless-gl)
    - go on npm npm install headless-gl
    - it runs a virus because the real package name is gl not headless-gl
    - I no longer have a computer to try out node with
    - this could have been avoided by giving the developer choices of secure hosts that only allowed the developer to take headless-gl and gl
  - I am a host provider
    - I have all these servers and I want to give back to the community
    - I don't have time to code because I'm too busy with admin work
    - I don't want to be a hosting platform because that is far more money than I want to put in
    - I find certain packages I likle and choose to share it with the world
    - People recognize these packages are the best around and they grow popular
- High Level API
  - `npm trust http://awesome-node-repos.gov --priority 10` - This now resolves awesome government names first
  - `npm untrust http://way-too-slow.com --keep-cache` - This will remove the url from trusted hosts but keep the resolved names there
- Key Algorithms/Abstractions
  - Caching and cache invalidation to ensure minimal amount of calls are done
  - BatchRequests - Writing Request, Parsing Request, Writing Response, Parsing Respoinse. Each of these should be able to handle very usable inputs.
- Challenges
  - Moving a giant infestructure like npm to basically the exact same thing with double the requests.
    - I'm not sure npm's current setup, but I'd imagine getting double the tcp requests per install is not something planned for
  - Changing the npm-cli tool to resolve first - I have no idea what happens in it to be honest. I probably should have looked first.
  - Despite availability, it may never be used
    - apt-get trusted sources is used often enough, but I imagine that when this is first introduced it may take a long time for it to get used
