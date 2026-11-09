using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Net;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;

namespace SamsCanvasSetup
{
    internal sealed class SetupWindow : Form
    {
        private readonly Color ink = Color.FromArgb(30, 41, 59);
        private readonly Color muted = Color.FromArgb(112, 125, 145);
        private readonly Color blue = Color.FromArgb(13, 153, 255);
        private readonly Label kicker = new Label();
        private readonly Label title = new Label();
        private readonly Label body = new Label();
        private readonly Label state = new Label();
        private readonly Label percent = new Label();
        private readonly ProgressTrack progress = new ProgressTrack();
        private readonly RoundedButton primary = new RoundedButton();
        private readonly RoundedButton secondary = new RoundedButton();
        private readonly Panel stageLine = new Panel();
        private WebClient activeClient;
        private Timer installPulse;
        private bool installing;
        private bool completed;
        private readonly string existingPackage;
        private readonly bool updateMode;
        private readonly bool forceRun;
        private readonly string installDirectory;
        private readonly string targetVersion;

        public SetupWindow(string[] args)
        {
            existingPackage = ReadArgument(args, "--package-file");
            updateMode = existingPackage != null || Array.Exists(args, delegate(string arg) { return String.Equals(arg, "--updated", StringComparison.OrdinalIgnoreCase); });
            if (existingPackage != null)
            {
                Match packageVersion = Regex.Match(Path.GetFileNameWithoutExtension(existingPackage), "^package-(.+)$");
                if (packageVersion.Success) targetVersion = packageVersion.Groups[1].Value;
            }
            forceRun = Array.Exists(args, delegate(string arg) { return String.Equals(arg, "--force-run", StringComparison.OrdinalIgnoreCase); });
            foreach (string arg in args) if (arg.StartsWith("/D=", StringComparison.OrdinalIgnoreCase)) installDirectory = arg.Substring(3);
            Text = updateMode ? "Sam's Canvas Update" : "Sam's Canvas Setup";
            StartPosition = FormStartPosition.CenterScreen;
            FormBorderStyle = FormBorderStyle.None;
            ClientSize = new Size(900, 570);
            MinimumSize = new Size(900, 570);
            BackColor = Color.White;
            DoubleBuffered = true;
            Font = new Font("Segoe UI", 10F);
            BuildLayout();
            ShowInTaskbar = true;
            installPulse = new Timer { Interval = 650 };
            installPulse.Tick += delegate { progress.Value = progress.Value >= 99 ? 95 : progress.Value + 1; };
        }

        private void BuildLayout()
        {
            var art = new FlowArtwork { Dock = DockStyle.Left, Width = 325 };
            Controls.Add(art);

            var close = new Label { Text = "×", Font = new Font("Segoe UI Light", 23F), ForeColor = Color.FromArgb(128, 142, 160), TextAlign = ContentAlignment.MiddleCenter, Size = new Size(42, 42), Location = new Point(842, 14), Cursor = Cursors.Hand };
            close.Click += delegate { Close(); };
            Controls.Add(close);

            close.BringToFront();

            kicker.Text = updateMode ? "SAM'S CANVAS  /  UPDATE" : "SAM'S CANVAS  /  CREATOR STUDIO";
            kicker.Font = new Font("Segoe UI Semibold", 8.2F);
            kicker.ForeColor = blue;
            kicker.AutoSize = true;
            kicker.Location = new Point(374, 70);
            Controls.Add(kicker);
            kicker.BringToFront();

            title.Text = updateMode ? "A fresh version is ready." : "Make room for your next big idea.";
            title.Font = new Font("Segoe UI Semibold", 24F);
            title.ForeColor = ink;
            title.Location = new Point(371, 104);
            title.Size = new Size(465, 76);
            title.BringToFront();

            body.Text = updateMode ? "We’ll bring Sam's Canvas up to date, then reopen your workspace." : "A calm, connected workspace for planning your next story. Install Sam's Canvas for your Windows account.";
            body.Font = new Font("Segoe UI", 10.3F);
            body.ForeColor = muted;
            body.Location = new Point(374, 192);
            body.Size = new Size(435, 60);
            body.BringToFront();

            stageLine.Location = new Point(374, 282);
            stageLine.Size = new Size(433, 1);
            stageLine.BackColor = Color.FromArgb(229, 234, 242);
            stageLine.BringToFront();

            state.Text = "READY WHEN YOU ARE";
            state.Font = new Font("Segoe UI Semibold", 8F);
            state.ForeColor = muted;
            state.AutoSize = true;
            state.Location = new Point(375, 312);
            state.BringToFront();

            percent.Text = "";
            percent.Font = new Font("Segoe UI Semibold", 9F);
            percent.ForeColor = ink;
            percent.TextAlign = ContentAlignment.MiddleRight;
            percent.Location = new Point(733, 307);
            percent.Size = new Size(74, 24);
            percent.BringToFront();

            progress.Location = new Point(374, 342);
            progress.Size = new Size(433, 8);
            progress.BringToFront();

            primary.Text = updateMode ? "Install update" : "Install Sam's Canvas";
            primary.Location = new Point(374, 393);
            primary.Size = new Size(433, 54);
            primary.Fill = blue;
            primary.ForeColor = Color.White;
            primary.Font = new Font("Segoe UI Semibold", 10.5F);
            primary.Click += async delegate { if (completed) LaunchApp(); else await BeginInstall(); };
            primary.BringToFront();

            secondary.Text = "Release notes";
            secondary.Location = new Point(374, 461);
            secondary.Size = new Size(433, 38);
            secondary.Fill = Color.Transparent;
            secondary.ForeColor = muted;
            secondary.Font = new Font("Segoe UI", 9F);
            secondary.Click += delegate
            {
                if (activeClient != null)
                {
                    activeClient.CancelAsync();
                    secondary.Enabled = false;
                    state.Text = "CANCELLING DOWNLOAD";
                    return;
                }
                Process.Start(new ProcessStartInfo("https://github.com/SpeakingRobot/sams-canvas/releases/latest") { UseShellExecute = true });
            };
            secondary.BringToFront();

            var footer = new Label { Text = "FREE TO CREATE  ·  DESIGNED FOR WINDOWS", Font = new Font("Segoe UI", 7.2F), ForeColor = Color.FromArgb(151, 161, 177), AutoSize = true, Location = new Point(374, 527) };
            Controls.Add(footer);
            footer.BringToFront();

            MouseDown += DragWindow;
            art.MouseDown += DragWindow;
            foreach (Control c in art.Controls) c.MouseDown += DragWindow;
        }

        private void DragWindow(object sender, MouseEventArgs e)
        {
            if (e.Button != MouseButtons.Left) return;
            ReleaseCapture();
            SendMessage(Handle, 0xA1, new IntPtr(2), IntPtr.Zero);
        }

        private async Task BeginInstall()
        {
            if (installing) return;
            installing = true;
            primary.Enabled = false;
            secondary.Text = "Cancel download";
            secondary.Enabled = true;
            try
            {
                ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
                SetStage("CONNECTING TO SPEAKINGROBOT", "Checking the latest Sam's Canvas release…", 0);
                ReleaseFiles files = await GetLatestRelease(targetVersion);
                string cache = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SamsCanvas", "Setup");
                Directory.CreateDirectory(cache);
                string packagePath = Path.Combine(cache, files.PackageName);
                string setupPath = Path.Combine(cache, files.EngineName);

                if (existingPackage != null)
                {
                    packagePath = existingPackage;
                    SetStage("VERIFYING YOUR UPDATE", "Checking the app package before applying the update.", 5);
                }
                else
                {
                    SetStage("DOWNLOADING YOUR WORKSPACE", "Getting the app package securely from the latest release.", 1);
                    await Download(files.PackageUrl, packagePath, 0, 91, files.PackageSize);
                }
                SetStage("VERIFYING DOWNLOAD", "Checking the package before installation.", 98);
                Verify(packagePath, files.PackageHash);

                SetStage("PREPARING INSTALL", "Preparing the verified Windows installer engine.", 95);
                secondary.Text = "Preparing…";
                secondary.Enabled = false;
                await Download(files.EngineUrl, setupPath, 95, 4, files.EngineSize);
                VerifySha256(setupPath, files.EngineHash);
                var engineArgs = new System.Text.StringBuilder("/S --package-file=\"").Append(packagePath).Append("\"");
                if (updateMode) engineArgs.Append(" --updated");
                if (forceRun) engineArgs.Append(" --force-run");
                if (!String.IsNullOrEmpty(installDirectory)) engineArgs.Append(" /D=\"").Append(installDirectory).Append("\"");
                state.Text = "INSTALLING YOUR UPDATE";
                using (Process child = Process.Start(new ProcessStartInfo(setupPath, engineArgs.ToString()) { UseShellExecute = false, CreateNoWindow = true, WindowStyle = ProcessWindowStyle.Hidden }))
                {
                    if (child == null) throw new InvalidOperationException("The Windows installer could not be started.");
                    installPulse.Start();
                    await Task.Run(delegate { child.WaitForExit(); });
                    installPulse.Stop();
                    if (child.ExitCode != 0) throw new InvalidOperationException("Setup did not finish successfully (code " + child.ExitCode + "). Please try again.");
                }
                completed = true;
                installing = false;
                state.Text = "YOUR CREATIVE SPACE IS READY";
                body.Text = updateMode ? "Sam's Canvas is up to date. Your workspace is ready." : "Sam's Canvas is installed. Open it now and start planning your next story.";
                percent.Text = "DONE";
                progress.Value = 100;
                primary.Text = "Open Sam's Canvas";
                primary.Fill = blue;
                primary.Enabled = true;
                secondary.Visible = false;
                if (updateMode && forceRun)
                {
                    state.Text = "UPDATE COMPLETE";
                    body.Text = "Your workspace is opening with the latest version.";
                    primary.Text = "All set";
                    primary.Enabled = false;
                    Timer closeAfterUpdate = new Timer { Interval = 1400 };
                    closeAfterUpdate.Tick += delegate { closeAfterUpdate.Stop(); closeAfterUpdate.Dispose(); Close(); };
                    closeAfterUpdate.Start();
                }
            }
            catch (Exception error)
            {
                if (IsDisposed || Disposing) return;
                installPulse.Stop();
                installing = false;
                primary.Enabled = true;
                secondary.Enabled = true;
                secondary.Text = "Release notes";
                SetStage("INSTALLATION PAUSED", error.Message, 0);
                primary.Text = "Try again";
            }
        }

        private async Task<ReleaseFiles> GetLatestRelease(string version)
        {
            string api = version == null
                ? "https://api.github.com/repos/SpeakingRobot/sams-canvas/releases/latest"
                : "https://api.github.com/repos/SpeakingRobot/sams-canvas/releases/tags/v" + Uri.EscapeDataString(version);
            string json;
            using (WebClient client = new WebClient())
            {
                client.Headers[HttpRequestHeader.UserAgent] = "SamsCanvas-Setup";
                client.Headers[HttpRequestHeader.Accept] = "application/vnd.github+json";
                json = await client.DownloadStringTaskAsync(api);
            }
            JavaScriptSerializer serializer = new JavaScriptSerializer();
            Dictionary<string, object> release = serializer.Deserialize<Dictionary<string, object>>(json);
            var assets = release["assets"] as System.Collections.IEnumerable;
            if (assets == null) throw new InvalidOperationException("The latest release does not contain installer files.");
            var links = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            var sizes = new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase);
            foreach (object item in assets)
            {
                var asset = item as Dictionary<string, object>;
                if (asset == null) continue;
                string name = Convert.ToString(asset["name"]);
                links[name] = Convert.ToString(asset["browser_download_url"]);
                sizes[name] = Convert.ToInt64(asset["size"]);
            }
            string manifestName = "latest.yml";
            if (!links.ContainsKey(manifestName)) throw new InvalidOperationException("The latest release is missing its update manifest.");
            string manifest;
            using (WebClient client = new WebClient()) manifest = await client.DownloadStringTaskAsync(links[manifestName]);
            Match engine = Regex.Match(manifest, "(?m)^  engine:\\s*(.+)$");
            Match engineHash = Regex.Match(manifest, "(?m)^  engineSha256:\\s*(.+)$");
            Match package = Regex.Match(manifest, "(?s)packages:\\s*x64:\\s*.*?size:\\s*(\\d+).*?sha512:\\s*(\\S+).*?path:\\s*(\\S+)");
            if (!engine.Success || !engineHash.Success || !package.Success) throw new InvalidOperationException("The release manifest is incomplete for Windows x64.");
            ReleaseFiles result = new ReleaseFiles();
            result.EngineName = engine.Groups[1].Value.Trim();
            result.EngineHash = engineHash.Groups[1].Value.Trim();
            result.PackageName = package.Groups[3].Value.Trim();
            result.PackageHash = package.Groups[2].Value.Trim();
            result.PackageSize = long.Parse(package.Groups[1].Value);
            if (!links.ContainsKey(result.EngineName) || !links.ContainsKey(result.PackageName)) throw new InvalidOperationException("The release is missing its Windows download files.");
            result.EngineUrl = links[result.EngineName];
            result.PackageUrl = links[result.PackageName];
            result.EngineSize = sizes[result.EngineName];
            return result;
        }

        private async Task Download(string url, string path, double start, double span, long total)
        {
            if (File.Exists(path)) File.Delete(path);
            using (WebClient client = new WebClient())
            {
                activeClient = client;
                client.Headers[HttpRequestHeader.UserAgent] = "SamsCanvas-Setup";
                client.DownloadProgressChanged += delegate(object sender, DownloadProgressChangedEventArgs e)
                {
                    double p = start + span * e.ProgressPercentage / 100.0;
                    SetProgress((int)Math.Min(99, p), e.BytesReceived, total);
                };
                try { await client.DownloadFileTaskAsync(new Uri(url), path); }
                finally { if (activeClient == client) activeClient = null; }
            }
        }

        private void Verify(string path, string expected)
        {
            using (SHA512 sha = SHA512.Create())
            using (FileStream stream = File.OpenRead(path))
            {
                string actual = Convert.ToBase64String(sha.ComputeHash(stream));
                if (!String.Equals(actual, expected, StringComparison.Ordinal))
                    throw new InvalidOperationException("The downloaded file did not pass its integrity check. Please try again.");
            }
        }

        private void VerifySha256(string path, string expected)
        {
            using (SHA256 sha = SHA256.Create())
            using (FileStream stream = File.OpenRead(path))
            {
                string actual = BitConverter.ToString(sha.ComputeHash(stream)).Replace("-", "").ToLowerInvariant();
                if (!String.Equals(actual, expected, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException("The installer engine failed its integrity check. Please try again.");
            }
        }

        private static string ReadArgument(string[] args, string name)
        {
            for (int i = 0; i < args.Length; i++)
            {
                if (args[i].StartsWith(name + "=", StringComparison.OrdinalIgnoreCase)) return args[i].Substring(name.Length + 1).Trim('"');
                if (String.Equals(args[i], name, StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length) return args[i + 1].Trim('"');
            }
            return null;
        }

        private void SetStage(string label, string message, int value)
        {
            if (InvokeRequired) { BeginInvoke(new Action(delegate { SetStage(label, message, value); })); return; }
            state.Text = label;
            body.Text = message;
            progress.Value = value;
            percent.Text = value > 0 ? value.ToString("0") + "%" : "";
        }

        private void SetProgress(int value, long received, long total)
        {
            if (InvokeRequired) { BeginInvoke(new Action(delegate { SetProgress(value, received, total); })); return; }
            progress.Value = Math.Max(progress.Value, value);
            percent.Text = progress.Value.ToString("0") + "%";
            if (total > 0)
                body.Text = "Downloading " + FormatBytes(received) + " of " + FormatBytes(total) + ". Your files are checked before setup.";
        }

        private static string FormatBytes(long bytes)
        {
            return (bytes / 1048576.0).ToString("0") + " MB";
        }

        private void LaunchApp()
        {
            try
            {
                string startMenu = Environment.GetFolderPath(Environment.SpecialFolder.StartMenu);
                string programs = Path.Combine(startMenu, "Programs");
                if (Directory.Exists(programs))
                {
                    foreach (string shortcut in Directory.GetFiles(programs, "*.lnk", SearchOption.AllDirectories))
                    {
                        if (Path.GetFileName(shortcut).IndexOf("Sam's Canvas", StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            Process.Start(new ProcessStartInfo(shortcut) { UseShellExecute = true });
                            Close();
                            return;
                        }
                    }
                }
                string localPrograms = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs");
                foreach (string exe in Directory.GetFiles(localPrograms, "Sam's Canvas.exe", SearchOption.AllDirectories))
                {
                    Process.Start(new ProcessStartInfo(exe) { UseShellExecute = true });
                    Close();
                    return;
                }
                MessageBox.Show(this, "Sam's Canvas was installed. You can open it from the Start menu.", "Setup complete", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex) { MessageBox.Show(this, ex.Message, "Could not open Sam's Canvas", MessageBoxButtons.OK, MessageBoxIcon.Information); }
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (installing)
            {
                if (activeClient != null) activeClient.CancelAsync();
                else { e.Cancel = true; return; }
            }
            else if (!completed && activeClient != null) activeClient.CancelAsync();
            base.OnFormClosing(e);
        }

        private sealed class ReleaseFiles
        {
            public string EngineName, PackageName, EngineUrl, PackageUrl, EngineHash, PackageHash;
            public long PackageSize, EngineSize;
        }

        [System.Runtime.InteropServices.DllImport("user32.dll")] private static extern bool ReleaseCapture();
        [System.Runtime.InteropServices.DllImport("user32.dll")] private static extern IntPtr SendMessage(IntPtr hWnd, int msg, IntPtr wParam, IntPtr lParam);
    }

    internal sealed class RoundedButton : Control
    {
        public Color Fill = Color.FromArgb(13, 153, 255);
        private bool over;
        public RoundedButton()
        {
            SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw, true);
            Cursor = Cursors.Hand;
        }
        protected override void OnMouseEnter(EventArgs e) { over = true; Invalidate(); base.OnMouseEnter(e); }
        protected override void OnMouseLeave(EventArgs e) { over = false; Invalidate(); base.OnMouseLeave(e); }
        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            Rectangle r = new Rectangle(0, 0, Width - 1, Height - 1);
            using (GraphicsPath p = Rounded(r, 11))
            using (SolidBrush b = new SolidBrush(Enabled ? (over && Fill != Color.Transparent ? ControlPaint.Light(Fill, 0.08f) : Fill) : Color.FromArgb(186, 198, 214)))
            using (Pen border = new Pen(Fill == Color.Transparent ? Color.FromArgb(229, 234, 242) : Fill))
            {
                if (Fill != Color.Transparent) e.Graphics.FillPath(b, p); else e.Graphics.DrawPath(border, p);
            }
            TextRenderer.DrawText(e.Graphics, Text, Font, r, ForeColor, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis);
        }
        private static GraphicsPath Rounded(Rectangle r, int radius)
        {
            int d = radius * 2; GraphicsPath p = new GraphicsPath();
            p.AddArc(r.X, r.Y, d, d, 180, 90); p.AddArc(r.Right-d, r.Y, d, d, 270, 90); p.AddArc(r.Right-d, r.Bottom-d, d, d, 0, 90); p.AddArc(r.X, r.Bottom-d, d, d, 90, 90); p.CloseFigure(); return p;
        }
    }

    internal sealed class ProgressTrack : Control
    {
        private int value;
        public int Value { get { return value; } set { this.value = Math.Max(0, Math.Min(100, value)); Invalidate(); } }
        public ProgressTrack() { SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true); }
        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            using (SolidBrush b = new SolidBrush(Color.FromArgb(232, 238, 246))) e.Graphics.FillRoundedRectangle(b, new Rectangle(0, 0, Width, Height), Height / 2);
            int w = (int)(Width * Math.Max(0, Math.Min(100, Value)) / 100.0);
            if (w > 0) using (SolidBrush b = new SolidBrush(Color.FromArgb(13, 153, 255))) e.Graphics.FillRoundedRectangle(b, new Rectangle(0, 0, Math.Max(Height, w), Height), Height / 2);
        }
    }

    internal sealed class FlowArtwork : Control
    {
        private readonly Color blue = Color.FromArgb(51, 170, 255);
        public FlowArtwork() { SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true); BackColor = Color.FromArgb(16, 25, 39); }
        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics; g.SmoothingMode = SmoothingMode.AntiAlias;
            using (LinearGradientBrush bg = new LinearGradientBrush(ClientRectangle, Color.FromArgb(19, 30, 47), Color.FromArgb(15, 23, 37), 45)) g.FillRectangle(bg, ClientRectangle);
            using (SolidBrush dots = new SolidBrush(Color.FromArgb(44, 145, 170, 202)))
                for (int y = 0; y < Height; y += 26) for (int x = 0; x < Width; x += 26) g.FillEllipse(dots, x, y, 2, 2);
            using (Font brand = new Font("Segoe UI Semibold", 12F)) using (SolidBrush white = new SolidBrush(Color.White)) g.DrawString("Sam's Canvas", brand, white, 30, 35);
            using (Font tag = new Font("Segoe UI", 7.5F)) using (SolidBrush light = new SolidBrush(Color.FromArgb(165, 184, 206))) g.DrawString("CREATOR STUDIO", tag, light, 31, 59);
            using (Pen wire = new Pen(Color.FromArgb(140, 51, 170, 255), 2.2F))
            {
                g.DrawBezier(wire, 42, 206, 95, 168, 164, 240, 267, 185);
                g.DrawBezier(wire, 47, 312, 114, 359, 185, 292, 259, 345);
            }
            DrawCard(g, 42, 147, 145, 74, "VIDEO IDEA", "A story worth telling", true);
            DrawCard(g, 111, 241, 151, 76, "SHOT SEQUENCE", "One moment at a time", false);
            using (SolidBrush dot = new SolidBrush(blue)) { g.FillEllipse(dot, 37, 201, 10, 10); g.FillEllipse(dot, 261, 180, 10, 10); g.FillEllipse(dot, 42, 308, 10, 10); g.FillEllipse(dot, 254, 340, 10, 10); }
            using (Font headline = new Font("Segoe UI Semibold", 21F)) using (SolidBrush white = new SolidBrush(Color.White)) g.DrawString("A little structure.\nA lot more possibility.", headline, white, 30, 386);
            using (Font desc = new Font("Segoe UI", 9F)) using (SolidBrush light = new SolidBrush(Color.FromArgb(173, 190, 211))) g.DrawString("Plan the idea. Shape the story.\nMake the next thing yours.", desc, light, 31, 453);
        }
        private void DrawCard(Graphics g, int x, int y, int w, int h, string label, string text, bool active)
        {
            Color border = active ? blue : Color.FromArgb(62, 78, 100);
            using (GraphicsPath p = Rounded(new Rectangle(x, y, w, h), 12)) using (SolidBrush fill = new SolidBrush(Color.FromArgb(245, 34, 45, 62))) using (Pen pen = new Pen(border, active ? 1.5F : 1)) { g.FillPath(fill, p); g.DrawPath(pen, p); }
            using (Font f = new Font("Segoe UI Semibold", 7.2F)) using (SolidBrush b = new SolidBrush(active ? blue : Color.FromArgb(160, 180, 204))) g.DrawString(label, f, b, x + 13, y + 13);
            using (Font f = new Font("Segoe UI", 8.5F)) using (SolidBrush b = new SolidBrush(Color.FromArgb(237, 242, 249))) g.DrawString(text, f, b, x + 13, y + 34);
        }
        private static GraphicsPath Rounded(Rectangle r, int radius)
        {
            int d = radius * 2; GraphicsPath p = new GraphicsPath(); p.AddArc(r.X, r.Y, d, d, 180, 90); p.AddArc(r.Right-d, r.Y, d, d, 270, 90); p.AddArc(r.Right-d, r.Bottom-d, d, d, 0, 90); p.AddArc(r.X, r.Bottom-d, d, d, 90, 90); p.CloseFigure(); return p;
        }
    }

    internal static class GraphicsExtensions
    {
        public static void FillRoundedRectangle(this Graphics g, Brush b, Rectangle r, int radius)
        {
            int d = radius * 2; using (GraphicsPath p = new GraphicsPath()) { p.AddArc(r.X,r.Y,d,d,180,90); p.AddArc(r.Right-d,r.Y,d,d,270,90); p.AddArc(r.Right-d,r.Bottom-d,d,d,0,90); p.AddArc(r.X,r.Bottom-d,d,d,90,90); p.CloseFigure(); g.FillPath(b,p); }
        }
    }

    internal static class Program
    {
        [STAThread]
        private static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new SetupWindow(args));
        }
    }
}
