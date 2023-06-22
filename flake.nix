{
  description = "A simple Go package";

  # Nixpkgs / NixOS version to use.
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-23.05";

  outputs = { self, nixpkgs }:
    let

      # to work with older version of flakes
      lastModifiedDate = self.lastModifiedDate or self.lastModified or "19700101";

      # Generate a user-friendly version number.
      version = builtins.substring 0 8 lastModifiedDate;

      # System types to support.
      supportedSystems = [ "x86_64-linux" "x86_64-darwin" "aarch64-linux" "aarch64-darwin" ];

      # Helper function to generate an attrset '{ x86_64-linux = f "x86_64-linux"; ... }'.
      forAllSystems = nixpkgs.lib.genAttrs supportedSystems;

      # Nixpkgs instantiated for supported system types.
      nixpkgsFor = forAllSystems (system: import nixpkgs { inherit system; });

    in
    {
      
      nixosModule = { config, options, lib, pkgs, ... }:
        let
          cfg = config.services.lolpizza2;
          lp = self.packages.${pkgs.system}.default;
        in
        with lib;
        {
          options.services.lolpizza2 = {
            enable = mkOption {
              type = types.bool;
              default = false;
              description = "wether to enable lolpizza2";
            };
            listen = mkOption {
              type = types.str;
              default = ":8393";
              description = "the domain/post lolpizza2 listens on";
            };
          };
          config = mkIf cfg.enable {
            systemd.services.lolpizza2 = {
              description = "lolpizza";
              after = [ "network.target" ];
              wantedBy = [ "multi-user.target" ];
              serviceConfig = {
                DynamicUser = true;
                PrivateTmp = "true";
                PrivateDevices = "true";
                ProtectHome = "true";
                ProtectSystem = "strict";
                AmbientCapabilities = "CAP_NET_BIND_SERVICE";
                ExecStart = "${lp}/bin/lolpizza2 ${cfg.listen}";
              };
            };
          };
        };
      packages = forAllSystems (system:
        let
          pkgs = nixpkgsFor.${system};
        in
        {
          default =
            pkgs.buildGoModule rec {
              pname = "lolpizza2";
              inherit version;
              # In 'nix develop', we don't need a copy of the source tree
              # in the Nix store.
              src = ./server;

              # This hash locks the dependencies of this package. It is
              # necessary because of how Go requires network access to resolve
              # VCS.  See https://www.tweag.io/blog/2021-03-04-gomod2nix/ for
              # details. Normally one can build with a fake sha256 and rely on native Go
              # mechanisms to tell you what the hash should be or determine what
              # it should be "out-of-band" with other tooling (eg. gomod2nix).
              # To begin with it is recommended to set this, but one must
              # remeber to bump this hash when your dependencies change.
              #vendorSha256 = pkgs.lib.fakeSha256;

              vendorSha256 = "sha256-mBgDs3YYBFm8gWy/JLDsZuapfkxm1+T2iJJAjOIe+TQ=";
            };
        });

      devShell = forAllSystems (system:
        let pkgs = nixpkgsFor.${system}; in
        (pkgs.mkShell {
          buildInputs = [ pkgs.nixpkgs-fmt pkgs.gopls pkgs.go pkgs.nodePackages.pnpm];
        }));
    };
}
