import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane, DollarSign, Shield, TrendingUp, Users, Globe, Zap, Lock, BarChart3 } from "lucide-react";
import { Link } from "wouter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Plane className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-900">BCCS Aircraft Registry</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/aircraft-registry">
            <Button variant="outline">Platform Access</Button>
          </Link>
          <Button className="bg-blue-600 hover:bg-blue-700">Get Started</Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="text-center py-20 px-6 max-w-6xl mx-auto">
        <Badge className="mb-6 bg-blue-100 text-blue-800 px-4 py-2">
          Revolutionary FinTech Platform
        </Badge>
        <h1 className="text-6xl font-bold text-slate-900 mb-6 leading-tight">
          Global Aviation Finance
          <span className="block text-blue-600">Marketplace Revolution</span>
        </h1>
        <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed">
          Transform aircraft ownership through blockchain-secured tokenization, comprehensive insurance marketplace, 
          maintenance services, and finance platform. The world's first integrated aviation financial ecosystem.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/aircraft-registry">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-lg">
              Explore Registry Platform
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="px-8 py-3 text-lg">
            Watch Demo
          </Button>
        </div>
      </section>

      {/* Market Impact Stats */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Market-Transforming Impact</h2>
            <p className="text-slate-600 text-lg">Targeting $150-300B addressable market with 4x valuation premium</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">$16.25B</div>
              <div className="text-slate-600">Target Valuation</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">$650M+</div>
              <div className="text-slate-600">ARR by Year 5</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">196</div>
              <div className="text-slate-600">Countries Targeted</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600 mb-2">15+</div>
              <div className="text-slate-600">Revenue Streams</div>
            </div>
          </div>
        </div>
      </section>

      {/* Revenue Streams */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Complete Aviation Financial Ecosystem</h2>
            <p className="text-slate-600 text-lg">Multiple marketplace revenue streams through integrated platform</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Plane className="w-8 h-8 text-blue-600 mb-2" />
                <CardTitle>Aircraft Tokenization</CardTitle>
                <CardDescription>Blockchain-secured fractional ownership</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Transaction Fees</span>
                    <span className="font-medium">2-5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Management Fees</span>
                    <span className="font-medium">1-2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Platform Fees</span>
                    <span className="font-medium">$10K-50K</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Shield className="w-8 h-8 text-green-600 mb-2" />
                <CardTitle>Insurance Marketplace</CardTitle>
                <CardDescription>Global aviation insurance network</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Commissions</span>
                    <span className="font-medium">5-15%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Partner Insurers</span>
                    <span className="font-medium">47+</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Annual Revenue</span>
                    <span className="font-medium">$12.4M+</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <TrendingUp className="w-8 h-8 text-purple-600 mb-2" />
                <CardTitle>Maintenance Services</CardTitle>
                <CardDescription>Certified maintenance providers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Transaction Fees</span>
                    <span className="font-medium">3-8%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Providers</span>
                    <span className="font-medium">127+</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Annual Revenue</span>
                    <span className="font-medium">$18.6M+</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <DollarSign className="w-8 h-8 text-orange-600 mb-2" />
                <CardTitle>Finance Platform</CardTitle>
                <CardDescription>Aviation lending marketplace</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Origination Fees</span>
                    <span className="font-medium">1-3%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Partner Lenders</span>
                    <span className="font-medium">89+</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Annual Revenue</span>
                    <span className="font-medium">$28.4M+</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Technology Infrastructure</h2>
            <p className="text-slate-600 text-lg">Enterprise-grade platform with government-level security</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Blockchain Security</h3>
              <p className="text-slate-600">Immutable ownership records with cryptographic verification</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Real-time Analytics</h3>
              <p className="text-slate-600">Advanced market intelligence and compliance monitoring</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Global Compliance</h3>
              <p className="text-slate-600">Regulatory frameworks for 196 countries worldwide</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Transform Aviation Finance?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join the revolution in aircraft ownership, insurance, maintenance, and financing
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/aircraft-registry">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 text-lg">
                Access Platform
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-blue-700 px-8 py-3 text-lg">
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Plane className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-white">BCCS Aircraft Registry</span>
            </div>
            <div className="text-slate-400 text-sm">
              © 2025 BCCS Aircraft Registry. Transforming global aviation finance.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}