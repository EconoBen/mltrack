class MltrackUv < Formula
  desc "Universal ML tracking tool for teams (UV-based)"
  homepage "https://github.com/EconoBen/mltrack"
  url "https://github.com/EconoBen/mltrack.git",
      tag: "v0.1.0",
      revision: "PLACEHOLDER_REVISION"
  license "MIT"
  
  depends_on "uv"

  def install
    # Install using UV tool
    system "uv", "tool", "install", "--from", buildpath.to_s, "mltrack"
    
    # UV installs to ~/.local/share/uv/tools/mltrack/bin/mltrack
    # We need to create a wrapper script
    (bin/"mltrack").write <<~EOS
      #!/bin/bash
      exec uvx mltrack "$@"
    EOS
    (bin/"mltrack").chmod 0755
  end

  def caveats
    <<~EOS
      mltrack has been installed via UV tools.
      
      You can run it with:
        mltrack --help
      
      Or directly via UV:
        uvx mltrack --help
    EOS
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/mltrack --version")
  end
end