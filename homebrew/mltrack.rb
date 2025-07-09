class Mltrack < Formula
  include Language::Python::Virtualenv

  desc "Universal ML tracking tool for teams"
  homepage "https://github.com/EconoBen/mltrack"
  url "https://github.com/EconoBen/mltrack/archive/v0.1.0.tar.gz"
  sha256 "PLACEHOLDER_SHA256"  # Update this with actual SHA256
  license "MIT"

  depends_on "python@3.11"
  depends_on "rust" => :build  # For UV

  # Install UV as part of the formula
  resource "uv" do
    url "https://github.com/astral-sh/uv/releases/latest/download/uv-installer.sh"
  end

  def install
    # Install UV first
    system "curl", "-LsSf", "https://astral.sh/uv/install.sh", "-o", "uv-installer.sh"
    system "sh", "uv-installer.sh", "--no-modify-path"
    uv_bin = buildpath/"uv"

    # Create virtual environment and install
    venv = virtualenv_create(libexec, "python3.11")
    
    # Install dependencies using UV for speed
    system uv_bin, "pip", "install", "--python", venv.root/"bin/python", "."
    
    # Link the mltrack executable
    bin.install_symlink libexec/"bin/mltrack"
  end

  test do
    # Test version command
    assert_match version.to_s, shell_output("#{bin}/mltrack --version")
    
    # Test doctor command
    output = shell_output("#{bin}/mltrack doctor 2>&1")
    assert_match "mltrack Doctor", output
    
    # Test init creates config
    Dir.mktmpdir do |dir|
      system bin/"mltrack", "init", "--path", dir
      assert_predicate Pathname.new(dir)/".mltrack.yml", :exist?
    end
  end
end