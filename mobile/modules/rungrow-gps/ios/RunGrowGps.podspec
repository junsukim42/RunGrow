Pod::Spec.new do |s|
  s.name = 'RunGrowGps'
  s.version = '1.0.0'
  s.summary = 'Native GPS recorder for the RunGrow running prototype'
  s.homepage = 'https://expo.dev'
  s.license = { :type => 'MIT' }
  s.author = 'RunGrow'
  s.source = { :git => '' }
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '**/*.swift'
end
